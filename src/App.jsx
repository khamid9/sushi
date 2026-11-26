import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home/Home.jsx";
import Menu from "./pages/Menu/Menu.jsx";
import Cart from "./pages/Cart/Cart.jsx";
import Admin from "./pages/Admin/Admin.jsx";

const SITE_URL = "https://sushi-five-ecru.vercel.app";

const PAGE_METADATA = {
  "/": {
    title: "Sushi Lab — роллы, суши и доставка в Бишкеке",
    description: "Закажите свежие роллы, суши и пиццу в Sushi Lab. Доставка по Бишкеку каждый день с 10:00 до 23:00.",
    robots: "index,follow",
    canonicalPath: "/",
  },
  "/menu": {
    title: "Меню Sushi Lab — роллы, пицца и доставка в Бишкеке",
    description: "Выберите роллы, пиццу и закуски в меню Sushi Lab. Состав, фото и цены с доставкой по Бишкеку.",
    robots: "index,follow",
    canonicalPath: "/menu",
  },
  "/cart": {
    title: "Корзина — Sushi Lab",
    description: "Проверьте выбранные блюда и оформите заказ в Sushi Lab.",
    robots: "noindex,follow",
  },
  "/admin": {
    title: "Вход в админ-панель — Sushi Lab",
    description: "Вход для управления заказами Sushi Lab.",
    robots: "noindex,nofollow",
  },
};

function PageMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = PAGE_METADATA[pathname] || PAGE_METADATA["/"];
    document.title = metadata.title;

    [
      ["name", "description", metadata.description],
      ["name", "robots", metadata.robots],
      ["property", "og:title", metadata.title],
      ["property", "og:description", metadata.description],
      ["property", "og:url", `${SITE_URL}${pathname}`],
    ].forEach(([attribute, name, content]) => {
      let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    });

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (metadata.canonicalPath) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", `${SITE_URL}${metadata.canonicalPath}`);
    } else {
      canonical?.remove();
    }
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <PageMetadata />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
