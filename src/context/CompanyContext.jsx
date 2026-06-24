import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import client from '../api/client';

const CompanyContext = createContext();

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider = ({ children }) => {
  const { user } = useAuth();
  const [activeCompany, setActiveCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Determine if user is admin
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.jobRole === 'ADMIN' || user?.jobRole === 'SUPER_ADMIN';

  useEffect(() => {
    const initCompany = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        // Fetch all departments (companies)
        const response = await client.get('/departments');
        const deptList = response.data.departments || response.data || [];
        setCompanies(deptList);

        if (!isAdmin && user.department_id) {
          // Standard users are locked to their assigned department
          const userDept = deptList.find(d => d.id === user.department_id);
          setActiveCompany(userDept || null);
        } else {
          // Admins can switch. Try to load from localStorage first
          const savedCompanyId = localStorage.getItem('activeCompanyId');
          if (savedCompanyId) {
            const savedDept = deptList.find(d => d.id === savedCompanyId);
            if (savedDept) {
              setActiveCompany(savedDept);
            } else if (deptList.length > 0) {
              setActiveCompany(deptList[0]);
              localStorage.setItem('activeCompanyId', deptList[0].id);
            }
          } else if (deptList.length > 0) {
            // Default to first (usually Biddabari / Prodhan)
            setActiveCompany(deptList[0]);
            localStorage.setItem('activeCompanyId', deptList[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load companies:", err);
      } finally {
        setLoading(false);
      }
    };

    initCompany();
  }, [user, isAdmin]);

  const changeCompany = (companyId) => {
    if (!isAdmin) return; // Prevent non-admins from switching
    const newCompany = companies.find(c => c.id === companyId);
    if (newCompany) {
      setActiveCompany(newCompany);
      localStorage.setItem('activeCompanyId', newCompany.id);
      // Trigger a soft reload or data re-fetch across the app if needed
      window.dispatchEvent(new Event('company-changed'));
    }
  };

  return (
    <CompanyContext.Provider value={{ activeCompany, companies, changeCompany, isAdmin, loadingCompanies: loading }}>
      {children}
    </CompanyContext.Provider>
  );
};
