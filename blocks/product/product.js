export default function decorate(block) {
  const [imageColumn, detailsColumn] = block.firstElementChild.children;

  imageColumn.classList.add('product-image');
  detailsColumn.classList.add('product-details');

  const paragraphs = detailsColumn.querySelectorAll(':scope > p');

  paragraphs[0]?.classList.add('product-category');
  paragraphs[1]?.classList.add('product-description');
  paragraphs[2]?.classList.add('product-price');
  paragraphs[3]?.classList.add('product-rating');
  paragraphs[4]?.classList.add('product-availability');
  paragraphs[5]?.classList.add('product-sku');
  paragraphs[6]?.classList.add('product-warranty');
  paragraphs[7]?.classList.add('product-shipping');
  paragraphs[8]?.classList.add('product-returns');
}
