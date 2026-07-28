import { createTheme, type MantineColorsTuple } from "@mantine/core";
import { MB_COLORS } from "./viz/options/constants";

// Metabase brand blue as a Mantine 10-shade tuple (index 6 = base brand).
const brand: MantineColorsTuple = [
  "#e9f3fc",
  "#d3e6fa",
  "#a6cdf3",
  "#78b4ed",
  "#589fe6",
  MB_COLORS.brand,
  "#509EE3",
  "#3d84c4",
  "#2f6ba1",
  "#1f527e",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: 5,
  colors: { brand },
  fontFamily: '"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  defaultRadius: "md",
  components: {
    Button: {
      defaultProps: { radius: "xl" },
    },
  },
});
