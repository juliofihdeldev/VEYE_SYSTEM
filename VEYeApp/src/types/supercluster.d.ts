declare module 'supercluster' {
  type PointFeature<P = Record<string, unknown>> = {
    type: 'Feature'
    id?: number | string
    properties: P
    geometry: { type: 'Point'; coordinates: [number, number] }
  }

  export default class Supercluster<P = Record<string, unknown>> {
    constructor(options?: Record<string, unknown>)
    load(points: PointFeature<P>[]): this
    getClusters(
      bbox: [number, number, number, number],
      zoom: number,
    ): PointFeature<P & { cluster?: boolean; cluster_id?: number; point_count?: number; mid?: string }>[]
  }
}
