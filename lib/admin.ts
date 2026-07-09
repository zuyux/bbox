export const ADMIN_ADDRESS = (
  process.env.NEXT_PUBLIC_ADMIN_ADDRESS || 'SP1N4FTM6XK4FS4KQGZBTJY70F4CR36WQET7JFSS7'
).trim().toUpperCase();

export const isAdminAddress = (address?: string | null) => {
  return String(address ?? '').trim().toUpperCase() === ADMIN_ADDRESS;
};
