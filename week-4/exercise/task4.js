const products = [
  {
    id: 1,
    name: "Laptop",
    price: 1000,
    stock: 5,
  },
  {
    id: 2,
    name: "Mouse",
    price: 50,
    stock: 10,
  },
  {
    id: 3,
    name: "Keyboard",
    price: 80,
    stock: 7,
  },
];

const cart = [];

let discount = 0;

function addToCart(productId, quantity) {
  const product = products.find((product) => product.id === productId);

  if (!product) {
    return "Product not found";
  }

  if (quantity <= 0) {
    return "Quantity must be greater than 0";
  }

  const cartItem = cart.find((item) => item.productId === productId);

  if (cartItem) {
    if (cartItem.quantity + quantity > product.stock) {
      return "Quantity exceeds available stock";
    }

    cartItem.quantity += quantity;
  } else {
    if (quantity > product.stock) {
      return "Quantity exceeds available stock";
    }

    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
    });
  }

  return "Product added to cart";
}

function removeFromCart(productId) {
  const index = cart.findIndex((item) => item.productId === productId);

  if (index === -1) {
    return "Product not found in cart";
  }

  cart.splice(index, 1);

  return "Product removed from cart";
}

function updateQuantity(productId, quantity) {
  const cartItem = cart.find((item) => item.productId === productId);

  if (!cartItem) {
    return "Product not found in cart";
  }

  const product = products.find((product) => product.id === productId);

  if (quantity > product.stock) {
    return "Quantity exceeds available stock";
  }

  if (quantity <= 0) {
    return removeFromCart(productId);
  }

  cartItem.quantity = quantity;

  return "Quantity updated";
}

function getCartTotal() {
  return cart.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
}

function applyDiscount(percent) {
  if (percent < 0 || percent > 100) {
    return "Invalid discount";
  }

  discount = percent;

  return "Discount applied";
}

function getCartSummary() {
  const subtotal = getCartTotal();

  const discountAmount = (subtotal * discount) / 100;

  const finalTotal = subtotal - discountAmount;

  return {
    items: cart,
    subtotal,
    discountPercent: discount,
    discountAmount,
    finalTotal,
  };
}

console.log(addToCart(1, 2));
console.log(addToCart(2, 3));

console.log(applyDiscount(10));

console.log(getCartSummary());
