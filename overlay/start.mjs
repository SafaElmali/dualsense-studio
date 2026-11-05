import { startBridge } from './bridge-server.mjs';

const requested = Number(process.env.PORT || 8765);
try {
  const { port } = await startBridge({ port: requested });
  console.log(`Overlay:  http://127.0.0.1:${port}/   (add this as an OBS Browser Source)`);
  console.log(`Send:     POST http://127.0.0.1:${port}/input  or  ws://127.0.0.1:${port}/ws`);
} catch (error) {
  console.error(error.code === 'EADDRINUSE' ? `Port ${requested} is already in use. Set PORT to another port.` : error);
  process.exit(1);
}
