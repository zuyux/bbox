export const ADMIN_ADDRESS = 'SP3Y50BTWXAXRQZ64NXBZV4VAMK4448Q3D2QZJV57';

export const isAdminAddress = (address?: string | null) => {
  return String(address ?? '').trim().toUpperCase() === ADMIN_ADDRESS;
};
