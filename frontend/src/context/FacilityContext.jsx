import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const FacilityContext = createContext(null);

export const FacilityProvider = ({ children }) => {
  const { token, roles, facilities: authFacilities } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchFacilities = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const isGlobalAdmin = roles && (roles.includes('SUPER_ADMIN') || roles.includes('PLATFORM_ADMIN'));
      const endpoint = isGlobalAdmin ? '/api/superadmin/facilities' : '/api/facilities';
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setFacilities(list);
        if (list.length > 0 && selectedFacilityId === 'all') {
          // keep 'all' as standard default
        }
      } else if (authFacilities && authFacilities.length > 0) {
        const mapped = authFacilities.map(f => ({
          _id: f.id || f._id,
          name: f.name
        }));
        setFacilities(mapped);
      }
    } catch (err) {
      console.error("Failed to load facilities scope", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [token, roles, authFacilities]);

  const getSelectedFacilityName = () => {
    if (selectedFacilityId === 'all') return 'All Facilities';
    const found = facilities.find(f => (f._id || f.id) === selectedFacilityId);
    return found ? found.name : 'Unknown Facility';
  };

  return (
    <FacilityContext.Provider value={{ 
      facilities, 
      selectedFacilityId, 
      setSelectedFacilityId, 
      selectedFacilityName: getSelectedFacilityName(),
      refreshFacilities: fetchFacilities,
      loading 
    }}>
      {children}
    </FacilityContext.Provider>
  );
};

export const useFacilities = () => useContext(FacilityContext);
