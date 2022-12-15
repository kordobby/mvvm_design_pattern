
/**
 *
 * * GET /api/쉿
 *
 * @summary [상품] 상품 리스트 가져오기
 * @description 상품 리스트를 가져온다 query의 offset 과 limit으로 페이지네이션을 하고 product_type에 따라서 상품 리스트를 가져온다
 * @pathParam {string} - product_type - 상품 타입
 * @response 200 - {product[]}
 * @tag 전체 상품 조회
 */

type FetchProductsCommandError = DefaultErrorResponse & {}

export class FetchProductsCommand
	implements IQueryCommand<FetchProductsQueryDTO, any, FetchProductsResponseDTO>
{
	private apiService: IRestfulApiService
	private productStore: ProductStoreType

	constructor(apiService: IRestfulApiService, productStore?: ProductStoreType) {
		this.apiService = apiService
		this.productStore = productStore
	}

	async execute({
		limit,
		offset,
		product_type,
	}: FetchProductsQueryDTO): Promise<FetchProductsResponseDTO> {
		const url = `/urlurlurl`
		const params = new URLSearchParams()

		if (product_type) {
			params.set('product_type', product_type)
		}

		if (offset) {
			params.set('offset', offset.toString())
		}
		if (limit) {
			params.set('limit', limit.toString())
		}

		try {
			const response = await this.apiService.fetch<FetchProductsResponseDTO>(url, {})

			if (this.productStore) {
				const { products, pagination } = response.data
				const converted = products.map((raw) => toProductFromServer(raw))
				this.productStore.products.update({ products: converted, pagination })
			}

			return response.data
		} catch (e) {
			return null
		}
	}
}
