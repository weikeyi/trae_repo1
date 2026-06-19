export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'repair-spare-parts-secret-key-2024',
    expiresIn: '24h' as string | number,
  },
  pagination: {
    defaultPage: 1,
    defaultPageSize: 20,
    maxPageSize: 100,
  },
};

export default config;
