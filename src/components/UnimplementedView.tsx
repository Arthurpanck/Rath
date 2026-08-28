import { Text } from "@mantine/core";
import type { VizId } from "../viz/registry";
import { VIZ_BY_ID } from "../viz/registry";
import { VizIcon } from "../viz/icons";
import { MB_COLORS } from "../viz/options/constants";

export function UnimplementedView({ vizId }: { vizId: VizId }) {
  const def = VIZ_BY_ID[vizId];
  return (
    <div style={{ textAlign: "center", color: MB_COLORS.textTertiary }}>
      <div style={{ color: MB_COLORS.borderStrong, display: "inline-flex" }}>
        <VizIcon name={def.icon} size={48} />
      </div>
      <Text style={{ marginTop: 12, fontSize: 15 }}>« {def.name} »</Text>
      <Text style={{ marginTop: 4, fontSize: 13 }}>
        Ce type de visualisation n'est pas encore pris en charge dans ce module.
      </Text>
    </div>
  );
}
