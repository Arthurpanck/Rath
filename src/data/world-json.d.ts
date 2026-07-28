// Type the bundled world GeoJSON loosely so tsc doesn't infer a giant literal
// type from the 150KB file (which would blow up type-checking).
declare module "*/world.json" {
  const value: { type: string; features: Array<{ type: string; properties: Record<string, unknown>; geometry: unknown }> };
  export default value;
}
