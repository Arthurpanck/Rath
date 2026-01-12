import { IVegaSubset } from "../../interfaces";

export interface DataLabelsConfig {
    fontSize?: number;
    format?: string;
    dy?: number;
}

/**
 * Creates a text layer for displaying data labels on a VegaLite spec.
 * Handles specs that already have layers (e.g., from autoCoord for maps or dashboard interactions).
 *
 * @param spec - The source spec (with or without existing layers)
 * @returns A text layer configuration or null if not applicable
 */
function createTextLayer(spec: IVegaSubset, config?: DataLabelsConfig) {
    // For multi-layer specs, find the first layer with encoding
    const sourceLayer = spec.layer && Array.isArray(spec.layer)
        ? spec.layer.find((l: any) => l && l.encoding)
        : null;

    const encoding = sourceLayer?.encoding || spec.encoding;

    if (!encoding) return null;

    // Determine which field contains the values to display
    const valueEncoding = encoding.y || encoding.x;
    if (!valueEncoding?.field) return null;

    // Determine mark type for positioning
    const markType = typeof spec.mark === 'string'
        ? spec.mark
        : (spec.mark?.type || (sourceLayer?.mark && typeof sourceLayer.mark === 'object' ? sourceLayer.mark.type : sourceLayer?.mark));

    // Default vertical offset based on mark type
    const defaultDy = markType === 'bar' ? -5 : markType === 'line' ? -8 : 0;

    return {
        mark: {
            type: "text" as const,
            dy: config?.dy ?? defaultDy,
            fontSize: config?.fontSize || 11
        },
        encoding: {
            ...encoding,
            text: {
                field: valueEncoding.field,
                type: "quantitative" as const,
                aggregate: valueEncoding.aggregate,
                format: config?.format || ".1f"
            }
        }
    };
}

/**
 * Adds data labels to a VegaLite visualization spec.
 *
 * This function wraps an existing spec with a text layer to display values on the chart.
 * It intelligently handles specs that already have layers (e.g., geographic maps,
 * dashboard charts with interactions) by appending the text layer to the existing layers
 * rather than creating nested layers (which VegaLite doesn't support).
 *
 * @param spec - The original VegaLite spec
 * @param show - Whether to add data labels (if false, returns original spec)
 * @param config - Optional configuration for label appearance
 * @returns The spec with data labels added, or the original spec if show is false
 */
export function addDataLabels(
    spec: IVegaSubset,
    show?: boolean,
    config?: DataLabelsConfig
): IVegaSubset {
    if (!show) return spec;

    const textLayer = createTextLayer(spec, config);
    if (!textLayer) return spec;

    // If the spec already has layers (e.g., from autoCoord for maps or dashboard interactions),
    // append the text layer to avoid nested layers
    if (spec.layer && Array.isArray(spec.layer)) {
        return {
            ...spec,
            layer: [...spec.layer, textLayer]
        };
    }

    // Otherwise, create a new layer structure
    return {
        layer: [spec, textLayer]
    };
}
