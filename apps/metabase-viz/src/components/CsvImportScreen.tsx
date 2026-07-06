import { useRef, useState } from "react";
import { Box, Button, Group, Stack, Text } from "@mantine/core";
import type { Dataset } from "../data/types";
import { parseCsv } from "../data/csv";
import { SAMPLE_CSV } from "../data/sample";
import { MB_COLORS } from "../viz/options/constants";

export function CsvImportScreen({ onLoad }: { onLoad: (d: Dataset, name: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleText = (text: string, name: string) => {
    try {
      const ds = parseCsv(text);
      if (ds.cols.length === 0 || ds.rows.length === 0) {
        setError("Le fichier CSV semble vide ou invalide.");
        return;
      }
      onLoad(ds, name);
    } catch {
      setError("Impossible de lire ce fichier CSV.");
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => handleText(String(reader.result ?? ""), file.name);
    reader.readAsText(file);
  };

  return (
    <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: MB_COLORS.bgLight }}>
      <Stack align="center" gap="lg" style={{ width: 560, maxWidth: "90vw" }}>
        <Stack align="center" gap={4}>
          <Text fw={700} style={{ fontSize: 26, color: MB_COLORS.textPrimary }}>
            Créer une visualisation
          </Text>
          <Text style={{ color: MB_COLORS.textTertiary, fontSize: 15, textAlign: "center" }}>
            Importez un fichier CSV pour commencer, puis choisissez un type de graphique.
          </Text>
        </Stack>

        <Box
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          style={{
            width: "100%",
            padding: "48px 24px",
            border: `2px dashed ${dragging ? MB_COLORS.brand : MB_COLORS.borderStrong}`,
            borderRadius: 12,
            background: dragging ? "rgba(80,158,227,0.06)" : MB_COLORS.white,
            cursor: "pointer",
            textAlign: "center",
            transition: "all .15s",
          }}
        >
          <div style={{ color: MB_COLORS.brand, marginBottom: 12 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <Text fw={600} style={{ color: MB_COLORS.textPrimary }}>
            Glissez-déposez un fichier CSV
          </Text>
          <Text style={{ color: MB_COLORS.textTertiary, fontSize: 13, marginTop: 4 }}>
            ou cliquez pour parcourir
          </Text>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </Box>

        {error && (
          <Text style={{ color: "#EF8C8C", fontSize: 13 }}>{error}</Text>
        )}

        <Group gap="xs">
          <Text style={{ color: MB_COLORS.textTertiary, fontSize: 13 }}>Pas de fichier ?</Text>
          <Button variant="subtle" size="compact-sm" color="brand" onClick={() => handleText(SAMPLE_CSV, "Exemple — commandes par année")}>
            Utiliser un jeu de données d'exemple
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}
