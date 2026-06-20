export const ADMIN_ADDRESS = (
  process.env.NEXT_PUBLIC_ADMIN_ADDRESS || 'SP3Y50BTWXAXRQZ64NXBZV4VAMK4448Q3D2QZJV57'
).trim().toUpperCase();

export const isAdminAddress = (address?: string | null) => {
  return String(address ?? '').trim().toUpperCase() === ADMIN_ADDRESS;
};
