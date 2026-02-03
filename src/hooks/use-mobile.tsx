import * as React from "react";

const PHONE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export type DeviceType = "phone" | "tablet" | "desktop";

export function useDeviceType() {
  const [deviceType, setDeviceType] = React.useState<DeviceType>("desktop");

  React.useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;
      if (width < PHONE_BREAKPOINT) {
        setDeviceType("phone");
      } else if (width < TABLET_BREAKPOINT) {
        setDeviceType("tablet");
      } else {
        setDeviceType("desktop");
      }
    };

    updateDeviceType();
    window.addEventListener("resize", updateDeviceType);
    return () => window.removeEventListener("resize", updateDeviceType);
  }, []);

  return {
    deviceType,
    isPhone: deviceType === "phone",
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop",
  };
}

// Keep original hook for backward compatibility
export function useIsMobile() {
  const { isPhone } = useDeviceType();
  return isPhone;
}
