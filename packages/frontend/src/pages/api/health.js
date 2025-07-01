export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'frontend',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
  });
}