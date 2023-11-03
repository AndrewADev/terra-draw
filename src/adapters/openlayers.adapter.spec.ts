import { Style } from "ol/style";
import { GeoJSONStoreFeatures } from "../store/store";
import { createMockLineString, createMockPoint } from "../test/mock-features";
import { TerraDrawOpenLayersAdapter } from "./openlayers.adapter";
import { FeatureLike } from "ol/Feature";

jest.mock("ol/style/Circle", () => jest.fn());
jest.mock("ol/style/Fill", () => jest.fn());
jest.mock("ol/style/Stroke", () => jest.fn());
jest.mock("ol/Feature", () => jest.fn());
jest.mock("ol/style/Style", () => jest.fn());
jest.mock("ol/proj", () => jest.fn());
jest.mock("ol/geom/Geometry", () => jest.fn());

describe("TerraDrawOpenLayersAdapter", () => {
	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawOpenLayersAdapter({
				map: {
					getViewport: jest.fn(() => ({
						setAttribute: jest.fn(),
					})),
				} as any,
				lib: {} as any,
			});

			expect(adapter).toBeDefined();
			expect(adapter.getMapContainer).toBeDefined();
			expect(adapter.render).toBeDefined();
			expect(adapter.register).toBeDefined();
			expect(adapter.unregister).toBeDefined();
			expect(adapter.project).toBeDefined();
			expect(adapter.unproject).toBeDefined();
			expect(adapter.setCursor).toBeDefined();
		});
	});

	describe("render", () => {
		describe("Point", () => {
			it("adds and deletes feature", () => {
				const p1 = createMockPoint("point-1") as GeoJSONStoreFeatures;
				const p2 = createMockPoint("point-2", 2, 4) as GeoJSONStoreFeatures;

				verifyAddingAndDeletingFeature(p1, p2);
			});
		});

		describe("LineString", () => {
			it("adds and deletes features", () => {
				const p1 = createMockLineString(
					"line-string-1",
				) as GeoJSONStoreFeatures;
				const p2 = createMockLineString(
					"line-string-2",
				) as GeoJSONStoreFeatures;

				verifyAddingAndDeletingFeature(p1, p2);
			});
		});
	});
});

const mockStyleDraw = {
	test: jest.fn(() => ({}) as any),
};

type styleCallback = (f: FeatureLike) => Style | undefined;

const verifyAddingAndDeletingFeature = (
	feature1: GeoJSONStoreFeatures,
	feature2: GeoJSONStoreFeatures,
) => {
	const addLayerMock = jest.fn();
	const readFeaturesMock = jest.fn();

	const mockGeoJSON = jest.fn(() => ({
		readFeatures: readFeaturesMock,
	}));

	const mockVectorSource = jest.fn();

	const mockVectorLayer = jest.fn(({ style }: { style: styleCallback }) => {
		style(feature1 as unknown as FeatureLike);
		style(feature2 as unknown as FeatureLike);
	});

	const adapter = new TerraDrawOpenLayersAdapter({
		map: {
			getViewport: jest.fn(() => ({
				setAttribute: jest.fn(),
			})),
			addLayer: addLayerMock,
		} as any,
		lib: {
			GeoJSON: mockGeoJSON,
			VectorSource: mockVectorSource,
			VectorLayer: mockVectorLayer,
		} as any,
	});

	adapter.render(
		{
			unchanged: [],
			created: [feature1, feature2],
			deletedIds: [],
			updated: [],
		},
		mockStyleDraw,
	);

	expect(readFeaturesMock).toHaveBeenCalled();

	expect(mockVectorSource).toHaveBeenCalled();

	expect(addLayerMock).toHaveBeenCalled();
};
