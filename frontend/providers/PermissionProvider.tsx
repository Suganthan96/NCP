"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { RequestExecutionPermissionsReturnType } from "@metamask/smart-accounts-kit/actions";

export type Permission = NonNullable<RequestExecutionPermissionsReturnType>[number];

interface PermissionsMap {
  [accountAddress: string]: Permission;
}

interface PermissionContextType {
  permissions: PermissionsMap;
  savePermission: (permission: Permission, accountAddress: string) => void;
  fetchPermission: (accountAddress: string) => Permission | null;
  removePermission: (accountAddress: string) => void;
  hasPermission: boolean;
  hasPermissionForAccount: (accountAddress: string) => boolean;
  getPermissionForAccount: (accountAddress: string) => Permission | null;
}

export const PermissionContext = createContext<PermissionContextType>({
  permissions: {},
  savePermission: () => { },
  fetchPermission: () => null,
  removePermission: () => { },
  hasPermission: false,
  hasPermissionForAccount: () => false,
  getPermissionForAccount: () => null,
});

export const PermissionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [permissions, setPermissions] = useState<PermissionsMap>({});

  // Load permissions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('erc4337_permissions');
    if (stored) {
      try {
        setPermissions(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored permissions:', e);
      }
    }
  }, []);

  // Saves the permission for a specific account to state and localStorage
  const savePermission = (newPermission: Permission, accountAddress: string) => {
    const normalizedAddress = accountAddress.toLowerCase();
    
    setPermissions(prev => {
      const updated = {
        ...prev,
        [normalizedAddress]: newPermission,
      };
      
      try {
        localStorage.setItem('erc4337_permissions', JSON.stringify(updated));
        console.log(`✅ Permission saved for account: ${accountAddress}`);
      } catch (e) {
        console.error('Failed to save permission:', e);
      }
      
      return updated;
    });
  };

  // Fetches the permission for a specific account from state
  const fetchPermission = (accountAddress: string): Permission | null => {
    const normalizedAddress = accountAddress.toLowerCase();
    return permissions[normalizedAddress] || null;
  };

  // Removes the permission for a specific account from state and localStorage
  const removePermission = (accountAddress: string) => {
    const normalizedAddress = accountAddress.toLowerCase();
    
    setPermissions(prev => {
      const updated = { ...prev };
      delete updated[normalizedAddress];
      
      try {
        localStorage.setItem('erc4337_permissions', JSON.stringify(updated));
        console.log(`🗑️ Permission removed for account: ${accountAddress}`);
      } catch (e) {
        console.error('Failed to remove permission:', e);
      }
      
      return updated;
    });
  };

  // Check if permission exists for a specific account address
  const hasPermissionForAccount = (accountAddress: string): boolean => {
    const normalizedAddress = accountAddress.toLowerCase();
    return !!permissions[normalizedAddress];
  };

  // Get permission for a specific account address
  const getPermissionForAccount = (accountAddress: string): Permission | null => {
    const normalizedAddress = accountAddress.toLowerCase();
    return permissions[normalizedAddress] || null;
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        savePermission,
        fetchPermission,
        removePermission,
        hasPermission: Object.keys(permissions).length > 0,
        hasPermissionForAccount,
        getPermissionForAccount,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  return useContext(PermissionContext);
};
