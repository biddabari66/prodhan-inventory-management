import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🧠 FELUDA LEARNING ANALYTICS
 * Analyzes user feedback to improve AI responses over time
 * Generates insights on most helpful responses and common queries
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin access
    const user = await base44.auth.me();
    if (!user || (user.job_role !== 'admin' && user.job_role !== 'super_admin')) {
      return Response.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    console.log('🧠 Generating Feluda Learning Analytics...');

    // Get all feedback
    const allFeedback = await base44.asServiceRole.entities.FeludaFeedback.list('-created_date', 1000);

    // Calculate metrics
    const totalInteractions = allFeedback.length;
    const helpfulResponses = allFeedback.filter(f => f.was_helpful).length;
    const helpfulnessRate = totalInteractions > 0 ? (helpfulResponses / totalInteractions * 100).toFixed(1) : 0;

    // Find most common questions
    const questionCounts = {};
    allFeedback.forEach(f => {
      const normalizedQuestion = f.user_question.toLowerCase().trim();
      questionCounts[normalizedQuestion] = (questionCounts[normalizedQuestion] || 0) + 1;
    });

    const topQuestions = Object.entries(questionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count]) => ({ question, count }));

    // Find best responses (helpful + used multiple times)
    const responsePatterns = {};
    allFeedback.filter(f => f.was_helpful).forEach(f => {
      const key = `${f.user_question.toLowerCase().substring(0, 50)}`;
      if (!responsePatterns[key]) {
        responsePatterns[key] = {
          question: f.user_question,
          response: f.feluda_response,
          count: 0,
          avgResponseTime: 0
        };
      }
      responsePatterns[key].count++;
      responsePatterns[key].avgResponseTime += f.response_time_ms || 0;
    });

    const bestResponses = Object.values(responsePatterns)
      .map(pattern => ({
        ...pattern,
        avgResponseTime: pattern.avgResponseTime / pattern.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Language breakdown
    const languageStats = {
      en: allFeedback.filter(f => f.language === 'en').length,
      bn: allFeedback.filter(f => f.language === 'bn').length
    };

    // Page context analysis
    const pageStats = {};
    allFeedback.forEach(f => {
      const page = f.page_context || 'unknown';
      if (!pageStats[page]) {
        pageStats[page] = { total: 0, helpful: 0 };
      }
      pageStats[page].total++;
      if (f.was_helpful) pageStats[page].helpful++;
    });

    const pageAnalysis = Object.entries(pageStats).map(([page, stats]) => ({
      page,
      total: stats.total,
      helpful: stats.helpful,
      helpfulnessRate: stats.total > 0 ? (stats.helpful / stats.total * 100).toFixed(1) : 0
    }));

    // User role analysis
    const roleStats = {};
    allFeedback.forEach(f => {
      const role = f.user_role || 'unknown';
      if (!roleStats[role]) {
        roleStats[role] = { total: 0, helpful: 0 };
      }
      roleStats[role].total++;
      if (f.was_helpful) roleStats[role].helpful++;
    });

    // Generate improvement suggestions
    const suggestions = [];
    
    if (helpfulnessRate < 70) {
      suggestions.push('⚠️ Overall helpfulness is below 70%. Consider refining system prompts.');
    }

    const problematicPages = pageAnalysis.filter(p => parseFloat(p.helpfulnessRate) < 60);
    if (problematicPages.length > 0) {
      suggestions.push(`⚠️ These pages need better help content: ${problematicPages.map(p => p.page).join(', ')}`);
    }

    if (languageStats.bn > languageStats.en * 0.5) {
      suggestions.push('💡 High Bengali usage detected. Consider adding more Bengali-specific examples.');
    }

    if (suggestions.length === 0) {
      suggestions.push('✅ Feluda is performing well! Keep monitoring for continuous improvement.');
    }

    const analytics = {
      overview: {
        totalInteractions,
        helpfulResponses,
        helpfulnessRate: parseFloat(helpfulnessRate),
        avgResponseTime: allFeedback.reduce((sum, f) => sum + (f.response_time_ms || 0), 0) / totalInteractions
      },
      topQuestions,
      bestResponses,
      languageStats,
      pageAnalysis,
      roleStats,
      suggestions,
      lastUpdated: new Date().toISOString()
    };

    console.log('✅ Learning analytics generated');

    return Response.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('❌ Learning analytics error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});