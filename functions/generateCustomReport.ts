import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_config } = await req.json();

    if (!report_config || !report_config.target_entity) {
      return Response.json({ 
        error: 'Invalid report configuration' 
      }, { status: 400 });
    }

    const { 
      target_entity, 
      selected_fields = [], 
      filters = [], 
      group_by_field, 
      aggregation_type,
      metric_field,
      include_movements = false,
      movement_types = ['return', 'adjustment'],
      date_range
    } = report_config;

    // Build filter query for Base44
    const filterQuery = {};
    
    filters.forEach(filter => {
      const { field, operator, value } = filter;
      
      if (operator === 'equals') {
        filterQuery[field] = value;
      } else if (operator === 'not_equals') {
        filterQuery[field] = { $ne: value };
      } else if (operator === 'greater_than') {
        filterQuery[field] = { $gt: value };
      } else if (operator === 'less_than') {
        filterQuery[field] = { $lt: value };
      } else if (operator === 'contains') {
        filterQuery[field] = { $regex: value, $options: 'i' };
      } else if (operator === 'in') {
        filterQuery[field] = { $in: value };
      }
    });

    // Date range filter if specified
    if (date_range && date_range.from) {
      const dateField = target_entity === 'Inventory' ? 'created_date' : 
                        target_entity === 'Expense' ? 'expense_date' :
                        target_entity === 'Income' ? 'income_date' :
                        target_entity === 'Lead' ? 'created_date' :
                        'created_date';
      
      filterQuery[dateField] = { 
        $gte: date_range.from,
        $lte: date_range.to || new Date().toISOString()
      };
    }

    // Fetch primary entity data
    const entityName = target_entity;
    const entityData = await base44.asServiceRole.entities[entityName].filter(filterQuery, '-created_date', 1000);

    let processedData = entityData;

    // For Inventory reports, include InventoryMovement data if requested
    if (target_entity === 'Inventory' && include_movements) {
      const inventoryIds = entityData.map(item => item.id);
      
      const movementFilter = {
        inventory_item_id: { $in: inventoryIds },
        movement_type: { $in: movement_types }
      };

      if (date_range && date_range.from) {
        movementFilter.movement_date = {
          $gte: date_range.from.split('T')[0],
          $lte: (date_range.to || new Date().toISOString()).split('T')[0]
        };
      }

      const movements = await base44.asServiceRole.entities.InventoryMovement.filter(
        movementFilter,
        '-movement_date',
        1000
      );

      // Aggregate movements by item
      const movementsByItem = {};
      movements.forEach(m => {
        if (!movementsByItem[m.inventory_item_id]) {
          movementsByItem[m.inventory_item_id] = {
            returns: [],
            damaged: [],
            total_returned_qty: 0,
            total_damaged_qty: 0,
            total_returned_value: 0,
            total_damaged_value: 0
          };
        }

        const movementData = movementsByItem[m.inventory_item_id];
        
        if (m.movement_type === 'return') {
          movementData.returns.push(m);
          movementData.total_returned_qty += Math.abs(m.quantity || 0);
          movementData.total_returned_value += Math.abs(m.total_value || 0);
        } else if (m.movement_type === 'adjustment' || m.reference_type === 'damage') {
          movementData.damaged.push(m);
          movementData.total_damaged_qty += Math.abs(m.quantity || 0);
          movementData.total_damaged_value += Math.abs(m.total_value || 0);
        }
      });

      // Attach movement data to inventory items
      processedData = entityData.map(item => ({
        ...item,
        movement_details: movementsByItem[item.id] || {
          returns: [],
          damaged: [],
          total_returned_qty: 0,
          total_damaged_qty: 0,
          total_returned_value: 0,
          total_damaged_value: 0
        }
      }));
    }

    // Grouping and aggregation if specified
    if (group_by_field && aggregation_type && metric_field) {
      const grouped = {};
      
      processedData.forEach(item => {
        const groupKey = item[group_by_field] || 'Unknown';
        
        if (!grouped[groupKey]) {
          grouped[groupKey] = {
            group: groupKey,
            items: [],
            count: 0,
            sum: 0,
            values: []
          };
        }
        
        grouped[groupKey].items.push(item);
        grouped[groupKey].count++;
        
        const value = parseFloat(item[metric_field]) || 0;
        grouped[groupKey].values.push(value);
        grouped[groupKey].sum += value;
      });

      // Calculate aggregations
      processedData = Object.values(grouped).map(g => {
        let aggregatedValue = 0;
        
        if (aggregation_type === 'sum') {
          aggregatedValue = g.sum;
        } else if (aggregation_type === 'average') {
          aggregatedValue = g.values.length > 0 ? g.sum / g.values.length : 0;
        } else if (aggregation_type === 'count') {
          aggregatedValue = g.count;
        } else if (aggregation_type === 'min') {
          aggregatedValue = Math.min(...g.values);
        } else if (aggregation_type === 'max') {
          aggregatedValue = Math.max(...g.values);
        }
        
        return {
          [group_by_field]: g.group,
          count: g.count,
          [metric_field]: aggregatedValue,
          items: g.items
        };
      });
    }

    // Apply field selection if specified
    if (selected_fields.length > 0) {
      processedData = processedData.map(item => {
        const filtered = {};
        selected_fields.forEach(field => {
          if (item[field] !== undefined) {
            filtered[field] = item[field];
          }
        });
        return filtered;
      });
    }

    return Response.json({
      success: true,
      data: processedData,
      metadata: {
        total_records: processedData.length,
        generated_at: new Date().toISOString(),
        report_config
      }
    });

  } catch (error) {
    console.error('Error generating custom report:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});