    import { CapacitorConfig } from '@capacitor/cli';
    
    const config: CapacitorConfig = {
      appId: 'com.arcanum.ai',
      appName: 'Arcanum',
      server: {
        url: "https://thearcanum.netlify.app", // This is the corrected URL
        cleartext: true
      }
    };
    
    export default config;
    