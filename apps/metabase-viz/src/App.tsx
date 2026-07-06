import { useState } from "react";
import type { Dataset } from "./data/types";
import { CsvImportScreen } from "./components/CsvImportScreen";
import { QueryBuilder } from "./components/QueryBuilder";

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [name, setName] = useState("Sans titre");

  if (!dataset) {
    return (
      <CsvImportScreen
        onLoad={(d, n) => {
          setDataset(d);
          setName(n.replace(/\.csv$/i, ""));
        }}
      />
    );
  }

  return <QueryBuilder dataset={dataset} datasetName={name} onReset={() => setDataset(null)} />;
}
