export default function manifest() {
  return {
    name: 'Worklance AI',
    short_name: 'Worklance',
    description: 'Unleash Collaborative Productivity - Your ultimate center to track local projects, plan tasks, and collaborate smoothly with your workspace.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192 512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon.png',
        sizes: '192x192 512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
  };
}
