import { useState, useCallback } from 'react';
import Papa from 'papaparse';

type CsvCell = string | number | boolean | null;
type CsvRow = Record<string, CsvCell>;

type ParseResult = {
  headers: string[];
  rows: CsvRow[];
  preview: CsvRow[];
  totalRows: number;
  error: string | null;
};

export function useCsvParser() {
  const [isParsing, setIsParsing] = useState(false);

  const parseFile = useCallback(async (file: File): Promise<ParseResult> => {
    setIsParsing(true);

    return new Promise((resolve) => {
      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete(results) {
          setIsParsing(false);
          const jsonData = results.data;

          if (jsonData.length === 0) {
            resolve({
              headers: [],
              rows: [],
              preview: [],
              totalRows: 0,
              error: 'Fichier vide ou format invalide',
            });
            return;
          }

          const headers = Object.keys(jsonData[0]);
          resolve({
            headers,
            rows: jsonData,
            preview: jsonData.slice(0, 5),
            totalRows: jsonData.length,
            error: null,
          });
        },
        error(err) {
          setIsParsing(false);
          resolve({
            headers: [],
            rows: [],
            preview: [],
            totalRows: 0,
            error: err.message,
          });
        },
      });
    });
  }, []);

  return { parseFile, isParsing };
}
