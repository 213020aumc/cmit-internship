const products = [
  { id: 1, name: "Keyboard", price: 50, stock: 10 },
  { id: 2, name: "Mouse", price: 25, stock: 4 },
  { id: 3, name: "Monitor", price: 200, stock: 7 },
];

function addProduct(products, newProduct) {
  return [...products, newProduct];
}

const addNewProduct = addProduct(products, {
  id: 4,
  name: "Headphones",
  price: 80,
  stock: 5,
});

// console.log("New Product Added: ", addNewProduct);

// console.log("Original Products: ", products);

function updateProductStock(products, productId, newStock) {
  return products.map((product) => {
    if (product.id === productId) {
      return {
        ...product,
        stock: newStock,
      };
    }
    return product;
  });
}

const updatedProductStock = updateProductStock(products, 3, 10);

// console.log("Updated Product Stock: ", updatedProductStock);

function updateProductPrice(products, productId, newPrice) {
  return products.map((product) => {
    if (product.id === productId) {
      return {
        ...product,
        price: newPrice,
      };
    }
    return product;
  });
}

const updatedProductPrice = updateProductPrice(products, 3, 10);

// console.log("Updated Product Price: ", updatedProductPrice);

function removeProduct(products, productId) {
  return products.filter((product) => product.id !== productId);
}

const remainingProducts = removeProduct(products, 1);

// console.log("Products after removal of One Product: ", remainingProducts);

function searchProductByName(products, name) {
  return products.filter((product) =>
    product.name.toLowerCase().includes(name.toLowerCase()),
  );
}

const searchedProduct = searchProductByName(products, "mouse");

// console.log("Searched Product: ", searchedProduct);

function getLowStockProducts(products, stockLimit) {
  return products.filter((product) => product.stock <= stockLimit);
}

const lowStockProducts = getLowStockProducts(products, 3);

// console.log("Low Stock Products 🚨", lowStockProducts);

function calculateIventoryValue(products) {
  return products.reduce((total, product) => {
    return total + product.price * product.stock;
  }, 0);
}

const calculatedInventoryValue = calculateIventoryValue(products);

// console.log("Calculated Inventory Value: ", calculatedInventoryValue);


