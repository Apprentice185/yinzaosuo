const storedData = JSON.parse(localStorage.getItem('printData') || 'null');
const data = storedData ? { ...printData, ...storedData, products: storedData.products || printData.products } : printData;
const pageDataVersion = localStorage.getItem('printDataVersion') || '';
function reloadWhenPublished() { if ((localStorage.getItem('printDataVersion') || '') !== pageDataVersion) window.location.reload(); }
window.addEventListener('storage', event => { if (event.key === 'printData' || event.key === 'printDataVersion' || event.key === 'contentCategories') reloadWhenPublished(); });
window.addEventListener('pageshow', reloadWhenPublished);
const id = new URLSearchParams(location.search).get('id');
const product = data.products.find(item => item.id === id) || data.products[0];
document.title = `${product.name}｜印造所`;
document.querySelector('#productCategory').textContent = `${product.category} · ${product.id}`;
document.querySelector('#productName').textContent = product.name;
document.querySelector('#productIntro').textContent = product.intro || product.desc;
document.querySelector('#productPrice').textContent = `${product.price}｜基础制作参考`;
const image = document.querySelector('#productImage');
image.style.backgroundImage = product.thumb ? `url("${product.thumb}")` : '';
if (!product.thumb) image.innerHTML = `<span>${product.category}<br><strong>${product.name}</strong></span>`;
document.querySelector('#detailOptions').innerHTML = (product.options || []).map((option, index) => `<label>${option.name}<select data-option-index="${index}">${option.values.map(value => `<option>${value}</option>`).join('')}</select></label>`).join('');
document.querySelector('#productQuote').addEventListener('click', () => { const selections = [...document.querySelectorAll('#detailOptions select')].map(select => `${product.options[select.dataset.optionIndex].name}：${select.value}`).join('；'); localStorage.setItem('pendingQuote', `${product.name}（${selections}）`); window.location.href = 'index.html#quoteModal'; });