import { useEffect, useState } from "react";

// Handles dark mode
export default function useHandleDarkMode() {
    const [isDarkMode, setIsDarkMode] = useState(true);
    
      // Detect color scheme on component mount (from CodePreviewPanel)
      useEffect(() => {
        // Gets the setting
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches); // Sets it
        
        const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        // Updates theme if mode changes
        mediaQuery.addEventListener('change', handler);
        // Runs on unmount
        return () => mediaQuery.removeEventListener('change', handler);
      }, []);

    return { isDarkMode };
}