import { Input } from "@/components/ui/input";
import { Barcode, Search } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import ProductCard from "./ProductCard";
import { productAPI, userAPI } from "@/services/api";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";

const ProductSection = () => {
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(() => Number(searchParams.get('productPage') || 0));
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [scanFeedback, setScanFeedback] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const loadInitialProducts = async () => {
      if (page === 0) {
        await fetchProducts(0, false);
        return;
      }

      // A refreshed deep link may point at page 1+; hydrate earlier pages first
      // so the visible list contains all products up to that page.
      await fetchProducts(0, false);
      for (let nextPage = 1; nextPage <= page; nextPage += 1) {
        await fetchProducts(nextPage, true);
      }
    };

    loadInitialProducts();
    // Refresh stock counts right after a checkout, without a manual page reload
    const refreshProducts = () => fetchProducts(0, false);
    window.addEventListener('productsUpdated', refreshProducts);
    return () => window.removeEventListener('productsUpdated', refreshProducts);
  }, []);

  const fetchProducts = async (requestedPage = 0, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const profile = await userAPI.getProfile();
      if (!profile?.storeId) {
        setError('Your account is not assigned to a store. Contact your manager.');
        setProducts([]);
        return;
      }
      const result = await productAPI.getByStoreIdPaged(profile.storeId, requestedPage, 10);
      const data = result?.content || [];
      setProducts(current => append ? [...current, ...data] : data);
      setPage(requestedPage);
      setHasMore(!result?.last && data.length > 0);
      const next = new URLSearchParams(searchParams);
      next.set('productPage', String(requestedPage));
      next.set('productSize', '10');
      next.set('productSort', 'createdAt');
      next.set('productDirection', 'desc');
      setSearchParams(next, { replace: true });
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
      if (!append) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreProducts = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchProducts(page + 1, true);
  };

  // Derive category pills (with live counts) straight from the fetched products
  const categories = useMemo(() => {
    const counts = new Map();
    products.forEach((p) => {
      const name = p.category?.name || 'Others';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [
      { name: 'All', count: products.length },
      ...Array.from(counts.entries()).map(([name, count]) => ({ name, count })),
    ];
  }, [products]);

  const filteredProducts = products.filter((product) => {
    if (activeCategory !== 'All' && (product.category?.name || 'Others') !== activeCategory) {
      return false;
    }
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.brand?.toLowerCase().includes(searchLower) ||
      product.category?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="barcode"]');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Barcode scanners act like a keyboard: they type the code fast, then send Enter.
  // Matching on Enter (rather than a length guess) means it works reliably and
  // never mistakenly swallows a manually-typed search.
  const handleSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const code = search.trim();
    if (!code) return;
    e.preventDefault();
    const product = products.find((p) => p.sku?.toLowerCase() === code.toLowerCase());
    if (product) {
      addToCart(product);
      setSearch('');
      setScanFeedback(null);
    } else {
      setScanFeedback(`No product found for code "${code}"`);
      setTimeout(() => setScanFeedback(null), 3000);
    }
  };

  const handleScanClick = () => {
    const searchInput = document.querySelector('input[placeholder*="barcode"]');
    if (searchInput) searchInput.focus();
  };

  return (
    <div className="w-full flex flex-col min-h-0 h-full overflow-hidden">
      <div className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Create Transaction</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">Pick products to start a new order</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={handleScanClick}
            title="Press F1 to focus search for barcode scanning"
          >
            <Barcode className="size-4" />
            <span className="hidden sm:inline">Scan (F1)</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer border',
                activeCategory === cat.name
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500/40'
              )}
            >
              {cat.name}
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs font-bold',
                  activeCategory === cat.name
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300'
                )}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search products or scan barcode (F1)"
            className="pl-10 h-11 rounded-full bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            value={search}
          />
        </div>
        {scanFeedback && (
          <p className="text-xs text-red-500 mt-2">{scanFeedback}</p>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 pb-4 sm:pb-6"
        onScroll={(event) => {
          const element = event.currentTarget;
          if (element.scrollHeight - element.scrollTop - element.clientHeight < 160) {
            loadMoreProducts();
          }
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-sm text-slate-400">Loading products...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-sm text-red-500 text-center">{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-sm text-slate-400 text-center">
              {search ? 'No products found matching your search' : 'No products available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => addToCart(product)}
              />
            ))}
          </div>
        )}
        {loadingMore && (
          <div className="flex justify-center py-4 text-sm text-slate-400">Loading more products...</div>
        )}
      </div>
    </div>
  );
};

export default ProductSection;
