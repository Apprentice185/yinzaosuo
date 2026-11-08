(() => {
 const settings=window.CMS_CONTENT?.siteSettings?.global||{};
 const lang=()=>localStorage.getItem('site_lang')==='zh'?'zh':'en';
 const apply=()=>{
  const zh=lang()==='zh';
  const announcement=document.querySelector('.announcement');
  if(announcement)announcement.textContent=settings[zh?'announcement_zh':'announcement_en']||announcement.textContent;
  document.querySelectorAll('.brand small').forEach(n=>n.textContent=settings[zh?'brand_tagline_zh':'brand_tagline_en']||n.textContent);
  const nav=document.querySelector('.main-nav');
  if(nav&&Array.isArray(settings.nav_items)&&settings.nav_items.length){
   const links=settings.nav_items.filter(x=>x.enabled!==false&&x.url).map(x=>{const a=document.createElement('a');a.href=x.url;a.textContent=x[zh?'label_zh':'label_en']||x.label_en||x.label_zh||'';return a;});
   nav.replaceChildren(...links);
  }
  const email=String(settings.contact_email||'').trim();
  document.querySelectorAll('.footer-contact a[href^="mailto:"]').forEach(a=>{if(email){a.href='mailto:'+email;a.textContent=email;}});
  const setLocalized = (selector, zhKey, enKey) => {
   document.querySelectorAll(selector).forEach(node => {
    const value=settings[zh?zhKey:enKey];
    if(typeof value==='string'&&value.trim()) node.textContent=value;
   });
  };
  setLocalized('.footer-brand > p','footer_tagline_zh','footer_tagline_en');
  setLocalized('[data-i18n="footer_hours"]','footer_hours_zh','footer_hours_en');
  setLocalized('[data-i18n="footer_delivery_detail"]','footer_delivery_zh','footer_delivery_en');
  setLocalized('[data-i18n="footer_copyright"]','footer_copyright_zh','footer_copyright_en');
  setLocalized('[data-i18n="footer_region"]','footer_region_zh','footer_region_en');
  const phone=String(settings.contact_phone||'').trim();
  document.querySelectorAll('.footer-phone').forEach(a=>{if(phone){a.href='tel:'+phone.replace(/[^+\d]/g,'');a.textContent=phone;}});
  if(location.pathname.endsWith('/new/')||location.pathname.endsWith('/new/index.html')){
   const title=settings[zh?'seo_home_title_zh':'seo_home_title_en'],desc=settings[zh?'seo_home_description_zh':'seo_home_description_en'];
   if(title)document.title=title;if(desc){const m=document.querySelector('meta[name="description"]'),o=document.querySelector('meta[property="og:description"]');if(m)m.content=desc;if(o)o.content=desc;}
  }
 };
 document.addEventListener('DOMContentLoaded',apply);
 document.querySelector('#languageToggle')?.addEventListener('click',()=>setTimeout(apply,0));
})();