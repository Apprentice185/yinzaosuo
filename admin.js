let currentType = 'products';
let currentId = '';
let editableData = JSON.parse(localStorage.getItem('printData') || 'null') || JSON.parse(JSON.stringify(printData));
if (!editableData.products) editableData.products = JSON.parse(JSON.stringify(printData.products || []));
if (!editableData.productCategories) editableData.productCategories = [...(printData.productCategories || [])];
const defaultGroups = ['订婚','结婚','满月宴','寿宴','开学季','毕业季','开业庆典','企业活动','极简','自然'];
let groups = JSON.parse(localStorage.getItem('templateGroups') || 'null') || [...new Set([...(editableData.templates || []).map(item => item.style).filter(Boolean), ...defaultGroups])];
const defaultCategories = { products: printData.productCategories || ['精美名片','宣传印品','画册书刊','企业办公','标签贴纸','餐饮物料','展架与海报','包装与周边'], templates: ['活动KT板','品牌名片','宣传单页','展架画面','包装贴纸'], knowledge: ['纸张与材料','文件规范','色彩印刷','装订工艺'], articles: ['品牌案例','材料上新','印刷知识'] };
let categories = JSON.parse(localStorage.getItem('contentCategories') || 'null') || JSON.parse(JSON.stringify(defaultCategories));
let groupMap = JSON.parse(localStorage.getItem('templateGroupsByCategory') || 'null') || Object.fromEntries(categories.templates.map(category => [category, [...groups]]));
const form = document.querySelector('#editorForm');
const list = document.querySelector('#itemList');
const editor = document.querySelector('#richEditor');
const toast = document.querySelector('#adminToast');
let activeImage = null;
function notify(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
function saveData() { editableData.productCategories = [...categories.products]; localStorage.setItem('printData', JSON.stringify(editableData)); localStorage.setItem('templateGroups', JSON.stringify(groups)); localStorage.setItem('templateGroupsByCategory', JSON.stringify(groupMap)); localStorage.setItem('contentCategories', JSON.stringify(categories)); localStorage.setItem('printDataVersion', String(Date.now())); notify('已保存，前台数据已更新'); }
function exportSiteData() { editableData.productCategories = [...categories.products]; const source = `const printData = ${JSON.stringify(editableData, null, 2)};\n`; const blob = new Blob([source], { type: 'text/javascript;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'site-data.js'; link.click(); URL.revokeObjectURL(url); notify('已导出 site-data.js，请替换项目中的同名文件'); }
function currentGroups() { const category = form.querySelector('[name="category"]').value; if (!groupMap[category]) groupMap[category] = [...groups]; return groupMap[category]; }
function renderGroups() { const styleField = form.querySelector('[name="style"]'); const available = currentGroups(); const selected = styleField.value; document.querySelector('#groupList').innerHTML = available.map(group => `<div class="manage-row"><button type="button" class="group-chip ${selected === group ? 'active' : ''}" data-group="${group}">${group}</button><button type="button" class="manage-edit" data-edit-group="${group}">重命名</button><button type="button" class="manage-delete" data-delete-group="${group}">删除</button></div>`).join(''); document.querySelectorAll('.group-chip').forEach(button => button.addEventListener('click', () => { setField('style', button.dataset.group); renderGroups(); })); document.querySelectorAll('[data-edit-group]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); renameGroup(button.dataset.editGroup); })); document.querySelectorAll('[data-delete-group]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); deleteGroup(button.dataset.deleteGroup); })); styleField.innerHTML = available.map(group => `<option>${group}</option>`).join(''); if (available.includes(selected)) styleField.value = selected; }
function renderCategories() { const current = categories[currentType]; document.querySelector('#categoryManagerTitle').textContent = currentType === 'products' ? '产品品类' : currentType === 'templates' ? '模板品类' : currentType === 'knowledge' ? '知识分类' : '资讯分类'; document.querySelector('#categoryList').innerHTML = current.map(category => `<div class="manage-row"><button type="button" class="category-chip" data-category="${category}">${category}</button><button type="button" class="manage-edit" data-edit-category="${category}">重命名</button><button type="button" class="manage-delete" data-delete-category="${category}">删除</button></div>`).join(''); document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => setField('category', button.dataset.category))); document.querySelectorAll('[data-edit-category]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); renameCategory(button.dataset.editCategory); })); document.querySelectorAll('[data-delete-category]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); deleteCategory(button.dataset.deleteCategory); })); }
function renderList() { list.innerHTML = editableData[currentType].map(item => `<div class="item-row ${item.id === currentId ? 'active' : ''}" data-id="${item.id}"><div><small>${currentType === 'templates' ? `${item.category} · ${item.style || '未分组'}` : item.category}</small><strong>${item.name || item.title}</strong></div><button type="button" class="item-delete" data-delete-item="${item.id}" aria-label="删除 ${item.name || item.title}">×</button></div>`).join(''); list.querySelectorAll('.item-row').forEach(row => row.addEventListener('click', event => { if (!event.target.closest('.item-delete')) loadItem(row.dataset.id); })); list.querySelectorAll('[data-delete-item]').forEach(button => button.addEventListener('click', () => deleteItem(button.dataset.deleteItem))); }
function setField(name, value = '') { const field = form.querySelector(`[name="${name}"]`); if (field) field.value = value || ''; }
function setUploadPreview(field, value) { const zone = document.querySelector(`.drop-zone[data-field="${field}"]`); if (!zone) return; zone.style.backgroundImage = value ? `url("${value}")` : ''; zone.classList.toggle('has-image', Boolean(value)); zone.dataset.value = value || ''; zone.childNodes[0].textContent = value ? '已上传图片（点击可替换）' : '拖入图片，或点击选择'; }
function loadItem(id) { const item = editableData[currentType].find(entry => entry.id === id); if (!item) return; currentId = item.id; setField('id', item.id); setField('title', item.title || item.name); setField('category', item.category); setField('style', item.style); setField('excerpt', item.excerpt || item.desc); setField('productIntro', item.intro); setField('size', item.size); setField('price', item.price); setField('tags', (item.tags || []).join(',')); setField('date', item.date); setField('productId', item.id); setField('productPrice', item.price); setField('productThumb', item.thumb); setField('productSceneImage', item.sceneImage); ['thumb','designImage','sizeImage','sceneImage','cover','productThumb','productSceneImage'].forEach(field => { setField(field, item[field]); setUploadPreview(field, item[field]); }); editor.innerHTML = item.content || item.intro || ''; renderProductOptions(item.options || []); document.querySelector('#editorMode').textContent = `编辑：${item.title || item.name}`; renderGroups(); renderCategories(); renderList(); }
function newItem() { currentId = ''; form.reset(); editor.innerHTML = ''; ['thumb','designImage','sizeImage','sceneImage','cover','productThumb','productSceneImage'].forEach(field => setUploadPreview(field, '')); setField('category', currentType === 'products' ? categories.products[0] : currentType === 'templates' ? '活动KT板' : currentType === 'knowledge' ? '纸张与材料' : '品牌案例'); if (currentType === 'templates') setField('style', currentGroups()[0]); renderProductOptions([]); document.querySelector('#editorMode').textContent = '新增内容'; renderGroups(); renderCategories(); renderList(); }
function renderProductOptions(options) { document.querySelector('#productOptionsEditor').innerHTML = options.map((option, index) => `<div class="option-row" data-option-row="${index}"><input class="option-name" placeholder="规格名称" value="${option.name || ''}"><input class="option-values" placeholder="选项值，用逗号分隔" value="${(option.values || []).join(',')}"><button type="button" class="manage-delete remove-option">删除</button></div>`).join(''); document.querySelectorAll('.remove-option').forEach(button => button.addEventListener('click', () => button.parentElement.remove())); }
function setEditorMode() { const isProduct = currentType === 'products'; const isTemplate = currentType === 'templates'; document.querySelector('#groupManager').style.display = isTemplate ? '' : 'none'; document.querySelector('#categoryManager').style.display = ''; document.querySelector('#styleLabel').style.display = isTemplate ? '' : 'none'; document.querySelector('.template-fields').style.display = isTemplate ? 'grid' : 'none'; document.querySelector('.product-fields').style.display = isProduct ? 'grid' : 'none'; document.querySelector('.article-only-fields').style.display = isProduct || isTemplate ? 'none' : 'block'; document.querySelector('.rich-editor-wrap').style.display = isProduct ? 'none' : ''; document.querySelector('#categoryLabel').firstChild.textContent = isProduct ? '产品品类' : isTemplate ? '模板品类' : currentType === 'knowledge' ? '知识分类' : '资讯分类'; form.elements.category.innerHTML = [...categories[currentType], '未分类'].filter((item, index, items) => items.indexOf(item) === index).map(item => `<option>${item}</option>`).join(''); renderCategories(); renderGroups(); }
function renameGroup(oldName) { const category = form.querySelector('[name="category"]').value; const available = currentGroups(); const newName = prompt('修改风格分组名称', oldName)?.trim(); if (!newName || newName === oldName || available.includes(newName)) return; available[available.indexOf(oldName)] = newName; editableData.templates.forEach(item => { if (item.category === category && item.style === oldName) item.style = newName; }); saveData(); renderGroups(); renderList(); loadItem(currentId); }
function deleteGroup(name) { const category = form.querySelector('[name="category"]').value; if (!confirm(`确认删除“${category}”下的风格分组“${name}”？使用它的模板会变成未分组。`)) return; groupMap[category] = currentGroups().filter(group => group !== name); editableData.templates.forEach(item => { if (item.category === category && item.style === name) item.style = ''; }); saveData(); renderGroups(); renderList(); }
function renameCategory(oldName) { const newName = prompt('修改分类名称', oldName)?.trim(); if (!newName || newName === oldName || categories[currentType].includes(newName)) return; categories[currentType][categories[currentType].indexOf(oldName)] = newName; editableData[currentType].forEach(item => { if (item.category === oldName) item.category = newName; }); saveData(); renderCategories(); renderList(); loadItem(currentId); }
function deleteCategory(name) { if (!confirm(`确认删除分类“${name}”？使用它的内容会变成未分类。`)) return; categories[currentType] = categories[currentType].filter(category => category !== name); editableData[currentType].forEach(item => { if (item.category === name) item.category = '未分类'; }); saveData(); renderCategories(); renderList(); }
function deleteItem(id) { const item = editableData[currentType].find(entry => entry.id === id); if (!item || !confirm(`确认删除“${item.title}”？删除后无法恢复。`)) return; editableData[currentType] = editableData[currentType].filter(entry => entry.id !== id); currentId = editableData[currentType][0]?.id || ''; saveData(); renderList(); if (currentId) loadItem(currentId); else newItem(); }
function fileToDataUrl(file, callback) { const reader = new FileReader(); reader.onload = () => callback(reader.result); reader.readAsDataURL(file); }
function attachUpload(zone) { const field = zone.dataset.field; const input = zone.querySelector('input'); const receive = file => { if (!file || !file.type.startsWith('image/')) return; fileToDataUrl(file, value => { setField(field, value); setUploadPreview(field, value); notify('图片已加入，提交表单后保存'); }); }; zone.addEventListener('click', () => input.click()); input.addEventListener('change', () => receive(input.files[0])); zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('dragging'); }); zone.addEventListener('dragleave', () => zone.classList.remove('dragging')); zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('dragging'); receive(event.dataTransfer.files[0]); }); }
function insertHtml(html) { document.execCommand('insertHTML', false, html); editor.focus(); }
editor.addEventListener('click', event => { if (event.target.tagName === 'IMG') { activeImage = event.target; document.querySelectorAll('.rich-editor img').forEach(image => image.classList.remove('editing-image')); activeImage.classList.add('editing-image'); } });
document.querySelectorAll('.drop-zone').forEach(attachUpload);
document.querySelectorAll('.admin-tabs button').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.admin-tabs button').forEach(item => item.classList.remove('active')); button.classList.add('active'); currentType = button.dataset.type; setEditorMode(); currentId = editableData[currentType][0]?.id || ''; if (currentId) loadItem(currentId); else newItem(); }));
form.querySelector('[name="category"]').addEventListener('change', () => { if (currentType === 'templates') { setField('style', currentGroups()[0] || ''); renderGroups(); } });
document.querySelector('#newItem').addEventListener('click', newItem);
document.querySelector('#exportData').addEventListener('click', exportSiteData);
document.querySelector('#addCategory').addEventListener('click', () => { const input = document.querySelector('#newCategory'); const value = input.value.trim(); if (value && !categories[currentType].includes(value)) { categories[currentType].push(value); input.value = ''; renderCategories(); setEditorMode(); saveData(); } });
document.querySelector('#addProductOption').addEventListener('click', () => { const rows = [...document.querySelectorAll('.option-row')].map(row => ({ name: row.querySelector('.option-name').value, values: row.querySelector('.option-values').value.split(',').map(value => value.trim()).filter(Boolean) })); rows.push({ name:'', values:[] }); renderProductOptions(rows); });
document.querySelector('#addGroup').addEventListener('click', () => { const input = document.querySelector('#newGroup'); const value = input.value.trim(); const available = currentGroups(); if (value && !available.includes(value)) { available.push(value); input.value = ''; renderGroups(); saveData(); } });
document.querySelectorAll('.rich-toolbar button[data-command]').forEach(button => button.addEventListener('click', () => { document.execCommand(button.dataset.command, false, button.dataset.value || null); editor.focus(); }));
document.querySelector('#fontSizeSelect').addEventListener('change', event => { document.execCommand('fontSize', false, event.target.value); editor.focus(); event.target.value = '3'; });
document.querySelectorAll('[data-image-size]').forEach(button => button.addEventListener('click', () => { if (activeImage) { activeImage.classList.remove('image-small','image-medium','image-large'); activeImage.classList.add(`image-${button.dataset.imageSize}`); } }));
document.querySelectorAll('[data-image-align]').forEach(button => button.addEventListener('click', () => { if (activeImage) { activeImage.classList.remove('align-left','align-center','align-right'); activeImage.classList.add(`align-${button.dataset.imageAlign}`); } }));
document.querySelector('#insertImage').addEventListener('click', () => document.querySelector('#articleImageInput').click());
document.querySelector('#articleImageInput').addEventListener('change', event => { const file = event.target.files[0]; if (file) fileToDataUrl(file, value => insertHtml(`<img src="${value}" alt="文章图片">`)); event.target.value = ''; });
document.querySelector('#insertVideo').addEventListener('click', () => { const url = prompt('粘贴视频外链（支持 bilibili、腾讯视频、优酷等 iframe 地址）'); if (url) insertHtml(`<div class="article-video"><iframe src="${url}" title="文章视频" frameborder="0" allowfullscreen></iframe></div>`); });
form.addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); const isProduct = currentType === 'products'; const id = isProduct ? (values.productId || currentId || `P${Date.now()}`) : (currentId || `${currentType === 'templates' ? 'M' : currentType === 'knowledge' ? 'K' : 'A'}${Date.now()}`); const optionRows = [...document.querySelectorAll('.option-row')].map(row => ({ name: row.querySelector('.option-name').value.trim(), values: row.querySelector('.option-values').value.split(',').map(value => value.trim()).filter(Boolean) })).filter(option => option.name && option.values.length); const item = isProduct ? { id, category: values.category, name: values.title, desc: values.excerpt, intro: values.productIntro || values.excerpt, price: values.productPrice, tag: '', thumb: values.productThumb, sceneImage: values.productSceneImage, options: optionRows } : { ...values, id, tags: (values.tags || '').split(',').map(tag => tag.trim()).filter(Boolean), content: editor.innerHTML }; delete item.idDisplay; if (currentType === 'templates') item.color = editableData.templates.find(entry => entry.id === currentId)?.color || '#aab8b0'; const index = editableData[currentType].findIndex(entry => entry.id === currentId); if (index >= 0) editableData[currentType][index] = item; else editableData[currentType].unshift(item); currentId = id; saveData(); renderList(); loadItem(currentId); });
document.querySelector('#resetData').addEventListener('click', () => { if (confirm('确认恢复默认数据吗？本浏览器中保存的修改会被清除。')) { localStorage.removeItem('printData'); localStorage.removeItem('templateGroups'); localStorage.removeItem('templateGroupsByCategory'); localStorage.removeItem('contentCategories'); location.reload(); } });
setEditorMode(); currentId = editableData.products?.[0]?.id || ''; if (currentId) loadItem(currentId); else newItem();
// ==========================================
// GitHub 仓库自动化同步模块
// ==========================================
(function() {
  const GH_REPO = 'apprentice185/yinzaosuo'; // 你的 GitHub 仓库路径
  const GH_FILE_PATH = 'site-data.js';      // 目标数据文件

  const ghTokenInput = document.getElementById('ghTokenInput');
  const saveTokenBtn = document.getElementById('saveTokenBtn');
  const syncGithubBtn = document.getElementById('syncGithubBtn');
  const syncStatus = document.getElementById('syncStatus');

  // 1. 初始化读取本地保存的 Token
  if (ghTokenInput) {
    ghTokenInput.value = localStorage.getItem('gh_sync_token') || '';
  }

  // 2. 记住 Token
  saveTokenBtn?.addEventListener('click', () => {
    const token = ghTokenInput.value.trim();
    if (!token) {
      alert('请输入有效的 GitHub Token！');
      return;
    }
    localStorage.setItem('gh_sync_token', token);
    alert('GitHub Token 已妥善保存在本浏览器！');
  });

  // 3. 核心上传覆盖函数
  async function pushDataToGitHub(siteDataObj) {
    const token = localStorage.getItem('gh_sync_token') || ghTokenInput.value.trim();
    if (!token) {
      alert('请先输入 GitHub Token 并点击“记住密钥”！');
      ghTokenInput.focus();
      return;
    }

    syncStatus.style.color = '#0284c7';
    syncStatus.innerText = '正在连接 GitHub 获取文件 SHA...';

    try {
      // 获取当前文件的 SHA
      const getRes = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE_PATH}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!getRes.ok) {
        throw new Error(`连接仓库失败: ${getRes.status} (请检查 Token 是否有效或具备 repo 权限)`);
      }

      const fileData = await getRes.json();
      const sha = fileData.sha;

      syncStatus.innerText = '正在提交最新数据并覆盖文件...';

      // 组装最新 site-data.js 代码并转 Base64
      const fileCode = `window.siteData = ${JSON.stringify(siteDataObj, null, 2)};\n`;
      const encodedContent = btoa(unescape(encodeURIComponent(fileCode)));

      // PUT 请求覆盖文件
      const putRes = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE_PATH}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: 'CMS: 后台自动更新全站数据 (site-data.js)',
          content: encodedContent,
          sha: sha,
          branch: 'main'
        })
      });

      if (!putRes.ok) {
        const errJson = await putRes.json();
        throw new Error(errJson.message || '覆盖失败');
      }

      syncStatus.style.color = '#16a34a';
      syncStatus.innerText = '✅ 同步成功！GitHub 正在自动部署上线...';
      alert('🎉 同步发布成功！\nGitHub Actions 已经自动开始构建，约 1 分钟后强制刷新在线网页即可看到更新。');

    } catch (err) {
      console.error(err);
      syncStatus.style.color = '#dc2626';
      syncStatus.innerText = `❌ 同步失败: ${err.message}`;
      alert(`同步失败：${err.message}`);
    }
  }

  // 4. 点击同步按钮：获取当前完整数据并推送到 GitHub
  syncGithubBtn?.addEventListener('click', async () => {
    // 优先读取你后台保存在 localStorage 的最新数据，如果没有则读取 window.siteData
    let fullData = null;
    const cache = localStorage.getItem('site_data') || localStorage.getItem('siteData') || localStorage.getItem('yinzaosuo_data');
    
    if (cache) {
      try {
        fullData = JSON.parse(cache);
      } catch (e) {}
    }

    if (!fullData && window.siteData) {
      fullData = window.siteData;
    }

    if (!fullData) {
      alert('未检测到站点数据，请先点击“保存到本浏览器”后再同步！');
      return;
    }

    await pushDataToGitHub(fullData);
  });
})();