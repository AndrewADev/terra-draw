/**
 * @jest-environment jsdom
 */
import { GeoJSONStoreFeatures } from "../store/store";
import {
	createMockLineString,
	createMockPoint,
	createMockPolygonSquare,
} from "../test/mock-features";
import { getMockPointerEvent } from "../test/mock-pointer-event";
import { TerraDrawGoogleMapsAdapter } from "./google-maps.adapter";

const createMockGoogleMap = (overrides?: Partial<google.maps.Map>) => {
	return {
		setValues: jest.fn(),
		unbind: jest.fn(),
		unbindAll: jest.fn(),
		bindTo: jest.fn(),
		get: jest.fn(),
		notify: jest.fn(),
		set: jest.fn(),
		addListener: jest.fn(),
		getBounds: jest.fn(),
		controls: [],
		data: {} as any,
		fitBounds: jest.fn(),
		getCenter: jest.fn(),
		getClickableIcons: jest.fn(),
		getDiv: jest.fn(),
		getHeading: jest.fn(),
		getMapTypeId: jest.fn(),
		getProjection: jest.fn(),
		getRenderingType: jest.fn(),
		getStreetView: jest.fn(),
		getTilt: jest.fn(),
		getZoom: jest.fn(),
		mapTypes: {} as any,
		moveCamera: jest.fn(),
		overlayMapTypes: [] as any,
		panBy: jest.fn(),
		panTo: jest.fn(),
		panToBounds: jest.fn(),
		setCenter: jest.fn(),
		setClickableIcons: jest.fn(),
		setHeading: jest.fn(),
		setMapTypeId: jest.fn(),
		setOptions: jest.fn(),
		setStreetView: jest.fn(),
		setTilt: jest.fn(),
		setZoom: jest.fn(),
		...overrides,
	} as google.maps.Map;
};

describe("TerraDrawGoogleMapsAdapter", () => {
	// Google, of course
	const testLng = -122.084252077;
	const testLat = 37.422592266;

	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
					})),
				} as any,
				map: createMockGoogleMap(),
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

	describe("getContainer", () => {
		it("returns map div", () => {
			const div = {} as HTMLDivElement;
			const mapMock = createMockGoogleMap({
				getDiv: jest.fn(() => div),
			});
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(() => undefined),
					})),
				} as any,
				map: mapMock,
			});

			expect(adapter.getMapContainer()).toBe(div);
		});
	});

	describe("getLngLatFromEvent", () => {
		it("returns null for unitialized map", () => {
			const mapMock = createMockGoogleMap();
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(() => undefined),
					})),
				} as any,
				map: mapMock,
			});

			expect(adapter.getLngLatFromEvent(getMockPointerEvent())).toBeNull();
			expect(mapMock.getBounds).toHaveBeenCalled();
		});

		it("returns null when no projection available", () => {
			const mapMock = createMockGoogleMap({
				getBounds: jest.fn(
					() =>
						({
							getNorthEast: jest.fn(),
							getSouthWest: jest.fn(),
						}) as unknown as google.maps.LatLngBounds,
				),
				getDiv: jest.fn(
					() =>
						({
							getBoundingClientRect: jest.fn(() => ({})),
						}) as unknown as HTMLDivElement,
				),
			});

			const getProjectionMock = jest.fn(() => undefined);
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					LatLngBounds: jest.fn(),
					Point: jest.fn(),
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			expect(adapter.getLngLatFromEvent(getMockPointerEvent())).toBeNull();
			expect(getProjectionMock).toHaveBeenCalled();
		});

		it("returns long & lat for click within bounds", () => {
			const mapMock = createMockGoogleMap({
				getBounds: jest.fn(
					() =>
						({
							getNorthEast: jest.fn(),
							getSouthWest: jest.fn(),
						}) as unknown as google.maps.LatLngBounds,
				),
				getDiv: jest.fn(
					() =>
						({
							getBoundingClientRect: jest.fn(() => ({})),
						}) as unknown as HTMLDivElement,
				),
			});

			const getProjectionMock = jest.fn(() => ({
				fromContainerPixelToLatLng: jest.fn(() => ({
					lng: () => testLng,
					lat: () => testLat,
				})),
			}));

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					LatLngBounds: jest.fn(() => ({
						contains: jest.fn(() => true),
					})),
					Point: jest.fn(),
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			const lngLatFromEvent = adapter.getLngLatFromEvent(getMockPointerEvent());
			expect(lngLatFromEvent?.lng).toEqual(testLng);
			expect(lngLatFromEvent?.lat).toEqual(testLat);
		});
	});

	describe("project", () => {
		it("throws for invalid long & lat", () => {
			const mapMock = createMockGoogleMap({
				getBounds: jest.fn(() => undefined),
			});

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(() => undefined),
					})),
				} as any,
				map: mapMock,
			});

			expect(() => {
				adapter.project(-1, -2);
			}).toThrowError();

			expect(mapMock.getBounds).toHaveBeenCalled();
		});

		it("throws when projection unavailable", () => {
			const mapMock = createMockGoogleMap();
			// For now the bounds are just used to determine if within the map (existence only)
			mapMock.getBounds = jest.fn(() => ({}) as google.maps.LatLngBounds);

			const getProjectionMock = jest.fn();

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			expect(() => {
				adapter.project(testLng, testLat);
			}).toThrowError();

			expect(getProjectionMock).toHaveBeenCalledTimes(1);
		});

		it("throws when coordinates cannot be projected", () => {
			const mapMock = createMockGoogleMap();
			// For now the bounds are just used to determine if within the map (existence only)
			mapMock.getBounds = jest.fn(() => ({}) as google.maps.LatLngBounds);

			const fromLatLngToContainerPixelMock = jest.fn(() => null);
			const getProjectionMock = jest.fn(() => ({
				fromLatLngToContainerPixel: fromLatLngToContainerPixelMock,
			}));

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			expect(() => {
				adapter.project(testLng, testLat);
			}).toThrowError();

			expect(getProjectionMock).toHaveBeenCalledTimes(1);
			expect(fromLatLngToContainerPixelMock).toHaveBeenCalledTimes(1);
		});

		it("projects valid long & lat", () => {
			const mapMock = createMockGoogleMap();
			// For now the bounds are just used to determine if within the map (existence only)
			mapMock.getBounds = jest.fn(() => ({}) as google.maps.LatLngBounds);

			const getProjectionMock = jest.fn(() => ({
				fromLatLngToContainerPixel: jest.fn(() => ({
					x: 50,
					y: 80,
				})),
			}));

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			const projected = adapter.project(testLng, testLat);

			expect(getProjectionMock).toHaveBeenCalledTimes(1);

			expect(projected.x).toEqual(50);
			expect(projected.y).toEqual(80);
		});
	});

	describe("unproject", () => {
		it("throws when projection unavailable", () => {
			const getProjectionMock = jest.fn(() => undefined);

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: createMockGoogleMap(),
			});

			expect(() => {
				adapter.unproject(-1, -2);
			}).toThrowError();

			expect(getProjectionMock).toHaveBeenCalled();
		});

		it("unprojects valid points", () => {
			const getProjectionMock = jest.fn(() => ({
				fromContainerPixelToLatLng: jest.fn(() => ({
					lng: () => testLng,
					lat: () => testLat,
				})),
			}));

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
					Point: jest.fn(),
				} as any,
				map: createMockGoogleMap(),
			});

			const unprojected = adapter.unproject(50, 80);
			expect(getProjectionMock).toHaveBeenCalledTimes(1);

			expect(unprojected.lng).toEqual(testLng);
			expect(unprojected.lat).toEqual(testLat);
		});
	});

	describe("setCursor", () => {
		it("is no-op for cursor: unset", () => {
			const map = createMockGoogleMap() as google.maps.Map;
			const container = {
				offsetLeft: 0,
				offsetTop: 0,
				style: { removeProperty: jest.fn(), cursor: "initial" },
			} as any;

			map.getDiv = jest.fn(() => container);

			// Create the adapter instance with the mocked map
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
				} as any,
				map,
			});

			adapter.setCursor("unset");

			expect(map.getDiv).not.toHaveBeenCalled();
			expect(container.style.removeProperty).not.toHaveBeenCalledTimes(1);
		});

		it("sets to pointer", () => {
			const elId = "map-container";
			const map = createMockGoogleMap() as google.maps.Map;
			const container = {
				...document.createElement("div"),
				offsetLeft: 0,
				offsetTop: 0,
				id: elId,
			};

			map.getDiv = jest.fn(() => container);

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
				} as any,
				map,
			});

			adapter.setCursor("pointer");

			expect(map.getDiv).toHaveBeenCalledTimes(1);
			const firstSheetAndRule = document.styleSheets[0]
				.cssRules[0] as CSSStyleRule;
			expect(
				firstSheetAndRule.selectorText.startsWith(`#${elId}`),
			).toBeTruthy();
			expect(
				firstSheetAndRule.cssText.includes(`cursor: pointer`),
			).toBeTruthy();
		});

		it("exits early when no update to cursor type", () => {
			const elId = "map-container";
			const map = createMockGoogleMap() as google.maps.Map;
			const container = {
				...document.createElement("div"),
				offsetLeft: 0,
				offsetTop: 0,
				id: elId,
			};

			map.getDiv = jest.fn(() => container);

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
				} as any,
				map,
			});

			adapter.setCursor("pointer");
			adapter.setCursor("pointer");
			adapter.setCursor("pointer");

			expect(map.getDiv).toHaveBeenCalledTimes(1);
		});
	});

	describe("render", () => {
		it("first invocation registers event listeners", () => {
			const addListenerMock = jest.fn();
			const addGeoJsonMock = jest.fn();
			const mockMap = createMockGoogleMap({
				data: {
					addListener: addListenerMock,
					addGeoJson: addGeoJsonMock,
					setStyle: jest.fn(),
				} as any,
			});
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
				} as any,
				map: mockMap,
			});

			adapter.render(
				{ unchanged: [], created: [], deletedIds: [], updated: [] },
				mockStyleDraw,
			);

			expect(addListenerMock).toHaveBeenNthCalledWith(
				1,
				"click",
				expect.any(Function),
			);
			expect(addListenerMock).toHaveBeenNthCalledWith(
				2,
				"mousemove",
				expect.any(Function),
			);
			expect(addGeoJsonMock).toHaveBeenCalledWith(
				expect.objectContaining({
					features: [],
				}),
			);
		});

		describe("Point", () => {
			it("adds and deletes features", () => {
				const p1 = createMockPoint("point-1") as GeoJSONStoreFeatures;
				const p2 = createMockPoint("point-2", 2, 4) as GeoJSONStoreFeatures;

				verifyAddingAndDeletingFeature(p1, p2);
			});

			it("adds features on successive renders", () => {
				const p1 = createMockPoint("point-1") as GeoJSONStoreFeatures;
				verifyAddingFeatureSecondRender(p1);
			});

			it("updates features on successive renders", () => {
				const p1 = createMockPoint("point-1") as GeoJSONStoreFeatures;
				verifyUpdatesFeature(p1);
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

			it("adds features on successive renders", () => {
				const p1 = createMockLineString(
					"line-string-1",
				) as GeoJSONStoreFeatures;
				verifyAddingFeatureSecondRender(p1);
			});

			it("updates features on successive renders", () => {
				const p1 = createMockLineString(
					"line-string-1",
				) as GeoJSONStoreFeatures;
				verifyUpdatesFeature(p1);
			});
		});

		describe("Polygon", () => {
			it("adds and deletes features", () => {
				const sq1 = createMockPolygonSquare("square-1") as GeoJSONStoreFeatures;
				const sq2 = createMockPolygonSquare(
					"square-2",
					2,
					4,
				) as GeoJSONStoreFeatures;

				verifyAddingAndDeletingFeature(sq1, sq2);
			});

			it("adds features on successive renders", () => {
				const sq1 = createMockPolygonSquare("square-1") as GeoJSONStoreFeatures;
				verifyAddingFeatureSecondRender(sq1);
			});

			it("updates features on successive renders", () => {
				const sq1 = createMockPolygonSquare("square-1") as GeoJSONStoreFeatures;
				verifyUpdatesFeature(sq1);
			});
		});
	});

	describe("clear", () => {
		it("is safe to call without features", () => {
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
				} as any,
				map: createMockGoogleMap(),
			});

			adapter.clear();
		});
	});
});

const mockStyleDraw = {
	test: jest.fn(() => ({}) as any),
};

const verifyAddingAndDeletingFeature = (
	feature1: GeoJSONStoreFeatures,
	feature2: GeoJSONStoreFeatures,
) => {
	const addGeoJsonMock = jest.fn();
	const removeMock = jest.fn();
	const mockMap = createMockGoogleMap({
		data: {
			addListener: jest.fn(),
			addGeoJson: addGeoJsonMock,
			remove: removeMock,
			getFeatureById: (featureId: string) =>
				[feature1, feature2].find((s) => s.id === featureId),
			setStyle: jest.fn(),
		} as any,
	});
	const adapter = new TerraDrawGoogleMapsAdapter({
		lib: {
			OverlayView: jest.fn(() => ({
				setMap: jest.fn(),
				getProjection: jest.fn(),
			})),
		} as any,
		map: mockMap,
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

	expect(addGeoJsonMock).toHaveBeenCalledWith(
		expect.objectContaining({
			features: [
				expect.objectContaining({
					id: feature1.id,
				}),
				expect.objectContaining({
					id: feature2.id,
				}),
			],
		}),
	);

	adapter.render(
		{
			unchanged: [feature1],
			created: [],
			deletedIds: [feature2.id!.toString()],
			updated: [],
		},
		mockStyleDraw,
	);

	expect(removeMock).toHaveBeenCalledWith(
		expect.objectContaining({
			id: feature2.id,
		}),
	);
};

const verifyAddingFeatureSecondRender = (feature: GeoJSONStoreFeatures) => {
	const addGeoJsonMock = jest.fn();
	const removeMock = jest.fn();
	const mockMap = createMockGoogleMap({
		data: {
			addListener: jest.fn(),
			addGeoJson: addGeoJsonMock,
			remove: removeMock,
			getFeatureById: jest.fn(),
			setStyle: jest.fn(),
		} as any,
	});
	const adapter = new TerraDrawGoogleMapsAdapter({
		lib: {
			OverlayView: jest.fn(() => ({
				setMap: jest.fn(),
				getProjection: jest.fn(),
			})),
		} as any,
		map: mockMap,
	});

	adapter.render(
		{ unchanged: [], created: [], deletedIds: [], updated: [] },
		mockStyleDraw,
	);

	expect(addGeoJsonMock).toHaveBeenCalledWith(
		expect.objectContaining({
			features: [],
		}),
	);

	adapter.render(
		{
			unchanged: [],
			created: [feature],
			deletedIds: [],
			updated: [],
		},
		mockStyleDraw,
	);

	expect(addGeoJsonMock).toHaveBeenCalledWith(
		expect.objectContaining({
			features: [expect.objectContaining({ id: feature.id })],
		}),
	);
};

function verifyUpdatesFeature(feature: GeoJSONStoreFeatures) {
	const addGeoJsonMock = jest.fn();
	const removeMock = jest.fn();
	Object.assign(feature, { forEachProperty: jest.fn() });
	Object.assign(feature, { setProperty: jest.fn() });
	Object.assign(feature, { setGeometry: jest.fn() });

	const mockMap = createMockGoogleMap({
		data: {
			addListener: jest.fn(),
			addGeoJson: addGeoJsonMock,
			remove: removeMock,
			getFeatureById: (featureId: string) =>
				[feature].find((s) => s.id === featureId),
			setStyle: jest.fn(),
		} as any,
	});
	const adapter = new TerraDrawGoogleMapsAdapter({
		lib: {
			OverlayView: jest.fn(() => ({
				setMap: jest.fn(),
				getProjection: jest.fn(),
			})),
			LatLng: jest.fn(),
			Data: {
				LineString: jest.fn(),
				Polygon: jest.fn(),
				Point: jest.fn(),
			},
		} as any,
		map: mockMap,
	});

	adapter.render(
		{ unchanged: [], created: [feature], deletedIds: [], updated: [] },
		mockStyleDraw,
	);

	expect(addGeoJsonMock).toHaveBeenCalledWith(
		expect.objectContaining({
			features: [expect.objectContaining({ id: feature.id })],
		}),
	);

	adapter.render(
		{
			unchanged: [],
			created: [],
			deletedIds: [],
			updated: [feature],
		},
		mockStyleDraw,
	);

	expect(addGeoJsonMock).toHaveBeenCalledWith(
		expect.objectContaining({
			features: [expect.objectContaining({ id: feature.id })],
		}),
	);
}
