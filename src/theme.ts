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

// Metabase's "Filtrer" purple and "Résumer" green.
const filter: MantineColorsTuple = ["#f3effc","#e3d9f7","#c9b6ef","#ae92e7","#9878e0","#8A64DF","#7C51D9","#6a3fc0","#5a34a4","#492a88"];
const summarize: MantineColorsTuple = ["#eef7ea","#dcefd3","#bbdfa8","#98cf7a","#7cc257","#69B85B","#5BA84E","#4a9440","#3c7f34","#2d6927"];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: 5,
  colors: { brand, filter, summarize },
  fontFamily: '"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  defaultRadius: "md",
  components: {
    Button: {
      defaultProps: { radius: "xl" },
    },
  },
});
