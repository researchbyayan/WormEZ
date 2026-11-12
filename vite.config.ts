import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],define:{'process.env.NODE_ENV':JSON.stringify('production')},build:{outDir:'dist-ui',emptyOutDir:true,lib:{entry:'src/main.tsx',name:'WormEZUI',formats:['iife'],fileName:()=> 'wormez-ui.js'},cssCodeSplit:false,rollupOptions:{output:{assetFileNames:(asset)=>asset.name?.endsWith('.css')?'wormez-ui.css':'[name][extname]'}}}});
