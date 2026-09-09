import { reviewService } from '../src/services/reviewService';
import { Product } from '../src/types';

// Mock test products
const productA: Product = {
  id: 'prod-uuid-a-1111',
  name: 'Original Product A Name',
  brand: 'Brand A',
  category: 'Technology',
  price: 999,
  images: ['https://example.com/product-a-v1.jpg'],
  description: 'Product A description',
  stock: 10,
  inStock: true,
  isActive: true,
  rating: 5,
  reviewCount: 1,
};

const productB: Product = {
  id: 'prod-uuid-b-2222',
  name: 'Product B Device',
  brand: 'Brand B',
  category: 'Home',
  price: 499,
  images: ['https://example.com/product-b.jpg'],
  description: 'Product B description',
  stock: 5,
  inStock: true,
  isActive: true,
  rating: 4.8,
  reviewCount: 1,
};

async function runTests() {
  console.log('=== STARTING KUD STORE CUSTOMER REVIEW SYSTEM VERIFICATION TESTS ===\n');

  // TEST 1: Product A has Review A. Product B has Review B. Confirm Product A displays only Review A.
  console.log('TEST 1: Product A has Review A. Product B has Review B. Confirm Product A displays only Review A.');
  await reviewService.submitReview({
    productId: productA.id,
    customerName: 'Customer For A',
    rating: 5,
    title: 'Review for Product A',
    comment: 'This is specifically for Product A.',
  }, productA);

  await reviewService.submitReview({
    productId: productB.id,
    customerName: 'Customer For B',
    rating: 5,
    title: 'Review for Product B',
    comment: 'This is specifically for Product B.',
  }, productB);

  const reviewsForA = await reviewService.getReviewsByProductId(productA.id, productA);
  const reviewsForB = await reviewService.getReviewsByProductId(productB.id, productB);

  const aHasOnlyA = reviewsForA.every(r => r.productId === productA.id) && !reviewsForA.some(r => r.title === 'Review for Product B');
  const bHasOnlyB = reviewsForB.every(r => r.productId === productB.id) && !reviewsForB.some(r => r.title === 'Review for Product A');

  if (aHasOnlyA && bHasOnlyB) {
    console.log('✅ PASS TEST 1: Strict isolation confirmed. Product A displays ONLY Review A, Product B displays ONLY Review B.\n');
  } else {
    throw new Error('❌ FAIL TEST 1: Review bleeding detected between products.');
  }

  // TEST 2: Rename Product A. Confirm Review A remains attached to Product A.
  console.log('TEST 2: Rename Product A. Confirm Review A remains attached to Product A.');
  const renamedProductA: Product = {
    ...productA,
    name: 'Completely Renamed Product A 2026 Edition',
  };
  const reviewsForRenamedA = await reviewService.getReviewsByProductId(renamedProductA.id, renamedProductA);
  const reviewAStillAttached = reviewsForRenamedA.some(r => r.productId === productA.id && r.title === 'Review for Product A');
  const usesUpdatedName = reviewsForRenamedA.find(r => r.productId === productA.id)?.productName === renamedProductA.name;

  if (reviewAStillAttached && usesUpdatedName) {
    console.log(`✅ PASS TEST 2: Product A renamed to "${renamedProductA.name}". Review remains attached by immutable ID and reflects the updated product name.\n`);
  } else {
    throw new Error('❌ FAIL TEST 2: Review failed to stay attached or update name.');
  }

  // TEST 3: Change Product A image. Confirm Review A displays Product A new/current image.
  console.log('TEST 3: Change Product A image. Confirm Review A displays Product A new/current image.');
  const newImageUrl = 'https://example.com/product-a-NEW-IMAGE-v2.jpg';
  const updatedImageProductA: Product = {
    ...productA,
    images: [newImageUrl],
  };
  const reviewsWithNewImage = await reviewService.getReviewsByProductId(updatedImageProductA.id, updatedImageProductA);
  const usesNewImage = reviewsWithNewImage.find(r => r.productId === productA.id)?.productImage === newImageUrl;

  if (usesNewImage) {
    console.log(`✅ PASS TEST 3: Product A image updated. Review correctly retrieves and displays current product image: ${newImageUrl}.\n`);
  } else {
    throw new Error('❌ FAIL TEST 3: Review did not reflect updated product image.');
  }

  // TEST 4: Create a review for Product B. Confirm it does not appear on Product A.
  console.log('TEST 4: Create a review for Product B. Confirm it does not appear on Product A.');
  await reviewService.submitReview({
    productId: productB.id,
    customerName: 'Another Reviewer',
    rating: 4,
    title: 'Second Review for Product B',
    comment: 'Another wonderful experience with Product B.',
  }, productB);

  const reviewsForACheck = await reviewService.getReviewsByProductId(productA.id, productA);
  const hasSecondBReview = reviewsForACheck.some(r => r.title === 'Second Review for Product B');

  if (!hasSecondBReview) {
    console.log('✅ PASS TEST 4: New review created for Product B strictly does NOT appear on Product A.\n');
  } else {
    throw new Error('❌ FAIL TEST 4: Product B review leaked onto Product A.');
  }

  // TEST 5: Attempt to manipulate product_id. Confirm a customer cannot create a review for an unauthorized/different product.
  console.log('TEST 5: Attempt to manipulate product_id. Confirm mismatch is rejected.');
  let manipulationBlocked = false;
  try {
    await reviewService.submitReview({
      productId: 'forged-or-mismatched-id',
      customerName: 'Hacker',
      rating: 1,
      title: 'Forged Review',
      comment: 'Attempting to inject wrong ID.',
    }, productA);
  } catch (err: any) {
    manipulationBlocked = true;
    console.log(`✅ PASS TEST 5: Tamper attempt blocked with expected error: "${err.message}".\n`);
  }
  if (!manipulationBlocked) {
    throw new Error('❌ FAIL TEST 5: Manipulation was not blocked.');
  }

  // TEST 6: Refresh the deployed storefront. Confirm the correct reviews remain associated with the correct products.
  console.log('TEST 6: Refresh the deployed storefront. Confirm correct reviews remain associated with correct products.');
  const allStorefrontReviews = await reviewService.getAllApprovedReviews([productA, productB]);
  const allValidAssociations = allStorefrontReviews.every(r => {
    if (r.productId === productA.id) return r.productName === productA.name;
    if (r.productId === productB.id) return r.productName === productB.name;
    return true; // Unlinked testimonials
  });

  if (allValidAssociations) {
    console.log('✅ PASS TEST 6: Storefront query accurately maps products strictly by immutable product_id without bleeding.\n');
  } else {
    throw new Error('❌ FAIL TEST 6: Storefront review association failed.');
  }

  // TEST 7: Test products with multiple reviews. Confirm every review remains associated with the correct product.
  console.log('TEST 7: Test products with multiple reviews. Confirm every review remains associated with correct product.');
  const multiReviewsB = await reviewService.getReviewsByProductId(productB.id, productB);
  if (multiReviewsB.length >= 2 && multiReviewsB.every(r => r.productId === productB.id)) {
    console.log(`✅ PASS TEST 7: Product B has ${multiReviewsB.length} reviews; every review is strictly associated with Product B.\n`);
  } else {
    throw new Error('❌ FAIL TEST 7: Multiple reviews association failed.');
  }

  console.log('🎉 ALL 7 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
