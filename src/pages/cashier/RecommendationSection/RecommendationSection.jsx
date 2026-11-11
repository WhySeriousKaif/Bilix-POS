import {
    Plus,
    Sparkles,
} from 'lucide-react'
import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import { useCart } from '@/contexts/CartContext'
import {
    productAPI,
    recommendationAPI,
    userAPI,
} from '@/services/api'


const RecommendationSection = () => {
    const {
        cartItems,
        addToCart,
    } = useCart()

    const [storeId, setStoreId] = useState(null)
    const [catalog, setCatalog] = useState([])
    const [recommendations, setRecommendations] =
        useState([])
    const [loading, setLoading] = useState(false)

    /*
     * Load the current store catalogue once.
     *
     * FastAPI returns stable product IDs. React uses
     * this catalogue to resolve those IDs into product
     * names, prices, images and stock information.
     */
    useEffect(() => {
        let active = true

        const loadStoreContext = async () => {
            try {
                const profile = await userAPI.getProfile()

                if (!profile?.storeId) {
                    return
                }

                const products =
                    await productAPI.getByStoreId(
                        profile.storeId,
                    )

                if (!active) {
                    return
                }

                setStoreId(profile.storeId)
                setCatalog(
                    Array.isArray(products)
                        ? products
                        : [],
                )
            }
            catch (error) {
                /*
                 * Recommendations are optional.
                 * Do not interrupt the cashier with an error
                 * toast if recommendation setup fails.
                 */
                console.warn(
                    'Recommendation catalogue unavailable:',
                    error.message,
                )
            }
        }

        loadStoreContext()

        return () => {
            active = false
        }
    }, [])

    /*
     * Quantity changes do not require another request.
     * Only the unique set of products in the cart matters
     * to the basket recommender.
     */
    const cartProductIds = useMemo(
        () =>
            Array.from(
                new Set(
                    cartItems.map(
                        item => Number(item.product.id),
                    ),
                ),
            ).sort((first, second) => first - second),
        [cartItems],
    )

    const cartProductKey =
        cartProductIds.join(',')

    useEffect(() => {
        if (!storeId) {
            return undefined
        }

        const controller = new AbortController()

        /*
         * A barcode scanner can add products quickly.
         * Debouncing prevents an HTTP request after every
         * rapid cart update.
         */
        const timeoutId = window.setTimeout(
            async () => {
                setLoading(true)

                try {
                    const response =
                        await recommendationAPI
                            .getRecommendations(
                                {
                                    storeId,
                                    productIds: cartProductKey
                                        ? cartProductKey
                                            .split(',')
                                            .map(Number)
                                        : [],
                                    topK: 3,
                                },
                                controller.signal,
                            )

                    if (controller.signal.aborted) {
                        return
                    }

                    if (!response?.available) {
                        setRecommendations([])
                        return
                    }

                    setRecommendations(
                        Array.isArray(
                            response.recommendations,
                        )
                            ? response.recommendations
                            : [],
                    )
                }
                catch (error) {
                    if (
                        error.name === 'AbortError'
                        || controller.signal.aborted
                    ) {
                        return
                    }

                    /*
                     * AI failure must not block product scanning
                     * or checkout.
                     */
                    console.warn(
                        'Recommendations unavailable:',
                        error.message,
                    )

                    setRecommendations([])
                }
                finally {
                    if (!controller.signal.aborted) {
                        setLoading(false)
                    }
                }
            },
            300,
        )

        return () => {
            window.clearTimeout(timeoutId)
            controller.abort()
        }
    }, [
        storeId,
        cartProductKey,
    ])

    const productById = useMemo(
        () =>
            new Map(
                catalog.map(product => [
                    Number(product.id),
                    product,
                ]),
            ),
        [catalog],
    )

    const recommendationCards = useMemo(
        () =>
            recommendations
                .map(recommendation => {
                    /*
                     * Spring currently serializes the nested
                     * product field as product_id.
                     */
                    const recommendationProductId =
                        recommendation.product_id
                        ?? recommendation.productId

                    const product = productById.get(
                        Number(
                            recommendationProductId,
                        ),
                    )

                    if (!product) {
                        return null
                    }

                    return {
                        recommendation,
                        product,
                    }
                })
                .filter(Boolean),
        [
            recommendations,
            productById,
        ],
    )

    if (
        !loading
        && recommendationCards.length === 0
    ) {
        return null
    }

    return (
        <section className='shrink-0 border-t border-slate-100 dark:border-white/5 px-4 sm:px-6 py-3 bg-violet-50/50 dark:bg-violet-500/5'>
            <div className='flex items-center gap-2 mb-2'>
                <span className='flex size-7 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300'>
                    <Sparkles className='size-3.5' />
                </span>

                <div>
                    <h3 className='text-sm font-bold text-slate-900 dark:text-white'>
                        Smart Suggestions
                    </h3>

                    <p className='text-[10px] text-slate-500 dark:text-slate-400'>
                        Based on products frequently bought together
                    </p>
                </div>
            </div>

            {loading
                && recommendationCards.length === 0
                ? (
                    <p className='text-xs text-slate-400 py-2'>
                        Finding suggestions…
                    </p>
                )
                : (
                    <div className='flex gap-2 overflow-x-auto pb-1'>
                        {recommendationCards.map(
                            ({
                                recommendation,
                                product,
                            }) => {
                                const inStock =
                                    product.quantity == null
                                    || product.quantity > 0

                                const isAssociationRule =
                                    recommendation.reason
                                    === 'association_rule'

                                return (
                                    <article
                                        key={product.id}
                                        className='min-w-[190px] flex-1 rounded-xl border border-violet-100 dark:border-violet-500/20 bg-white dark:bg-slate-900 p-2.5'
                                    >
                                        <div className='flex gap-2'>
                                            <div className='size-11 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5'>
                                                {product.image
                                                    ? (
                                                        <img
                                                            src={product.image}
                                                            alt={product.name}
                                                            className='size-full object-cover'
                                                        />
                                                    )
                                                    : (
                                                        <div className='size-full flex items-center justify-center text-[8px] text-slate-400'>
                                                            No image
                                                        </div>
                                                    )}
                                            </div>

                                            <div className='min-w-0 flex-1'>
                                                <p className='truncate text-xs font-semibold text-slate-900 dark:text-white'>
                                                    {product.name}
                                                </p>

                                                <p className='text-xs font-bold text-violet-600 dark:text-violet-300'>
                                                    ₹
                                                    {Number(
                                                        product.sellingPrice
                                                        ?? product.price
                                                        ?? 0,
                                                    ).toFixed(2)}
                                                </p>

                                                <p className='text-[9px] text-slate-400 truncate'>
                                                    {isAssociationRule
                                                        ? 'Frequently bought together'
                                                        : 'Popular product'}
                                                </p>
                                            </div>

                                            <button
                                                type='button'
                                                disabled={!inStock}
                                                onClick={() =>
                                                    addToCart(product)
                                                }
                                                className='size-8 shrink-0 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
                                                title={
                                                    inStock
                                                        ? `Add ${product.name}`
                                                        : 'Out of stock'
                                                }
                                            >
                                                <Plus className='size-4' />
                                            </button>
                                        </div>
                                    </article>
                                )
                            },
                        )}
                    </div>
                )}
        </section>
    )
}

export default RecommendationSection