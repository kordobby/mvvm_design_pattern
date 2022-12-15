

```javascript

/**
 * GET /api/v1/products/:id
 *
 * @summary [상품] 상품 아이디로 조회하기
 * @description productId 값과 일치하는 product 관련 데이터를 리턴 productVariants 테이블과 조인해서 쿼리 작성
 * @pathParam {number} id - productId
 * @response 200 - {product}
 * @tag 상품상세 페이지
 */

export class FetchProductCommand
	implements IQueryCommand<GetProductQueryDTO, any, ProductResponseDTO>
{
	private apiService: IRestfulApiService
	constructor(apiService: IRestfulApiService) {
		this.apiService = apiService
	}

	async execute(query: GetProductQueryDTO): Promise<ProductResponseDTO> {
		const url = `/aaaaa/${query.id}`

		return this.apiService.fetch<ProductResponseDTO>(url, {}).then((res) => res.data)
	}
}


```


```javascript
    // viewModel 내에서 선언
	const getProductCommand = useMemo(
		() => new FetchProductCommand(apiService as RestfulApiService),
		[apiService],
	)
```

```javascript
import { useLocalObservable } from 'mobx-react-lite'
import { debounce } from 'debounce'
import { IViewModel, ViewModelAction, ViewModelStatus } from '@/lib/viewModels'
import { FlatListActions, FlatListStatus } from '@/components'
import { Page, PageType } from '@/lib/pagination'
import { IRestfulApiService, RestfulApiService } from '@/lib/apiService'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { GlobalConfigStoreType } from '@/hooks/useConfig'
import { ProductListItemData, ProductListItemMetadata } from '../components/ProductList'
import { Product, ProductStoreType } from '../stores/ProductModel'
import { SHOP_CART_PAGE } from '@/settings/constant'
import { FilterListType } from '../components/FilterListType'
import { FetchProductsCommand } from '../commands/fetchProductsCommand'
import { Modal } from 'antd'

type ProductListViewModelProps = {
	apiService?: IRestfulApiService
	router?: ReturnType<typeof useRouter>
	config?: GlobalConfigStoreType
	rootStore?: ProductStoreType
	products?: Product[]
}

type ProductListViewModelStatus = ViewModelStatus &
	FlatListStatus & {
		showModal: boolean
		showFilter: boolean
	}

type SearchState = 'searching' | 'searched' | 'empty'
type SearchType = 'handout' | 'textbook' | 'workbook'
type SearchTypeMap = {
	[key in SearchType]: ProductListItemData[]
}

type ProductListViewModelActions = ViewModelAction &
	FlatListActions<ProductListItemData, ProductListItemMetadata> & {
		getPagination: () => PageType
		getSelected: () => ProductListItemData
		onEmptyClick: () => void
		onResetFilter: () => void
		updatePageChange: (pageIndex: number) => void
		get textBooks(): ProductListItemData[]
		get handouts(): ProductListItemData[]
		get workbooks(): ProductListItemData[]

		get keyword(): string

		get searchState(): SearchState

		get checkboxList(): FilterListType[]
		setKeyword: (keyword: string) => void
		onCart: () => Promise<void>
		sorting: (sort: string) => ProductListItemData[]
		onShowModal: (item: FilterListType) => void
		onShowMobileFilter: () => void
		fetchProducts: (offset: number, limit: number, fetchMore?: boolean) => Promise<void>
	}

interface ProductListViewLocalStore {
	_items: ProductListItemData[]
	selected: ProductListItemData
	paging: PageType
	_keyword: string
	// filterList: FilterListType[]
	_filters: FilterListType[]
}

type IProductListViewModel = IViewModel<
	ProductListViewModelProps,
	ProductListViewModelStatus,
	ProductListViewModelActions
>

const toProductListItemFromProduct = (product: Product): ProductListItemData => {
	return {
		id: product.id,
		title: product.title,
		product,
	} as ProductListItemData
}

export const ProductListViewModel: IProductListViewModel = ({
	apiService,
	config,
	router,
	rootStore,
	products,
}) => {
	let q = (router.query.q as string) || ''
	const defaultPageLimit = config?.defaultPageLimit || 10
	// const routerHistory = useUpdateRouterHistory({ router, defaultPageLimit })

	const getProductListCommand = useMemo(
		() => new FetchProductsCommand(apiService as RestfulApiService, rootStore),
		[apiService, rootStore],
	)

	useEffect(() => {
		actions.initialize({})
	}, [])

	const status = useLocalObservable<ProductListViewModelStatus>(() => ({
		addingItems: false,
		errors: [],
		initialized: false,
		loading: false,
		refreshing: false,
		showModal: false,
		showFilter: false,
	}))

	const actions = useLocalObservable<ProductListViewModelActions & ProductListViewLocalStore>(
		() => ({
			_keyword: q || '',
			_items: [],
			paging: Page({ pageSize: config?.defaultPageLimit || 10 }),
			selected: undefined,
			_filters: [],
			async initialize(props: {}) {
				console.log('initialize', status.initialized)

				await actions.fetchProducts(0, 10)

				actions._filters = rootStore?.products?.filters
				status.initialized = true
				status.loading = false
			},
			dispose(): void {},

			async fetchProducts(
				offset: number = 0,
				limit: number = 10,
				fetchMore: boolean = false,
			) {
				try {
					const response = await getProductListCommand.execute({ offset, limit })
				} catch (e) {
					Modal.error({
						title: 'Error',
						content: e.message,
					})
				}
			},

			get textBooks(): ProductListItemData[] {
				return actions.items.filter((item) => item.product.source_type === 'textbook')
			},

			get workbooks(): ProductListItemData[] {
				return actions.items.filter((item) => item.product.source_type === 'workbook')
			},
			get handouts(): ProductListItemData[] {
				return actions.items.filter((item) => item.product.source_type === 'handout')
			},

			onResetFilter(): void {},

			//@todo sorting 호출에러
			sorting(sort): ProductListItemData[] {
				if (sort === 'name') {
					return actions.items.sort((a, b) => {
						return a.id - b.id
					})
				} else if (sort === 'price') {
				}
			},

			get items(): ProductListItemData[] {
				console.log('getItems')
				return (
					products?.map(toProductListItemFromProduct) ||
					rootStore?.products?.products.map(toProductListItemFromProduct) ||
					[]
				)
			},
			//@
			get filters(): FilterListType[] {
				if (rootStore) {
					return rootStore?.products?.filters.map((filter) => {
						return filter as FilterListType
					})
				} else {
					return actions._filters
				}
			},
			get searchState(): SearchState {
				return undefined
			},

			getPagination(): PageType {
				return actions.paging
			},
			updatePageChange(pageIndex: number): void {
				console.log('updatePageChange', pageIndex)
				const next = actions.paging.next(pageIndex)
				actions.paging.setCurrent(next.offset, next.limit, next.total)
			},
			setKeyword(keyword: string): void {
				actions._keyword = keyword
			},

			get keyword(): string {
				return actions._keyword
			},

			getSelected(): ProductListItemData {
				return actions.selected
			},

			async onItemClick({ item, metadata }) {
				alert(JSON.stringify(item))
			},
			onEmptyClick(): void {
				console.log('d')
			},
			async onCart() {
				// await delay(300)
				router.push(SHOP_CART_PAGE)
			},
			onLoadMore: debounce(
				async () => {
					status.addingItems = true

					try {
					} catch (e) {}

					status.addingItems = false
				},
				300,
				true,
			),
			onShowModal(item): void {
				status.showModal = !status.showModal
			},
			onShowMobileFilter(): void {
				status.showFilter = !status.showFilter
			},
			onRefresh: debounce(
				async () => {
					status.refreshing = true
					try {
					} catch (e) {}

					// const { success, resultCode } = await new FetchNewsCommand(news).execute()
					status.refreshing = false
				},
				300,
				true,
			),
		}),
	)

	return useLocalObservable(() => ({
		status,
		actions,
	}))
}

export type ProductListViewModelType = ReturnType<typeof ProductListViewModel>

```