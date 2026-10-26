const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./load-ts.cjs');
const Link = ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);

test('dashboard menus and home links honor administrator roles while public browsing remains explicit', () => {
  const load = loader({
    react: { ...React, useState: () => [true, () => {}] },
    './navigation-link': { NavigationLink: Link },
    'next/navigation': { usePathname: () => '/dashboard' },
  });
  const { AppTopbar } = load('src/components/layout/app-topbar.tsx');
  const { UserMenu } = load('src/components/layout/user-menu.tsx');
  for (const [isAdmin, isSuperAdmin, target] of [[false, false, '/dashboard'], [true, false, '/admin/dashboard'], [true, true, '/super-admin/dashboard'], [false, true, '/super-admin/dashboard']]) {
    const props = { isAdmin, isSuperAdmin, userEmail: 'member@example.test', userName: 'Member', userImage: null, userInitial: 'M', languageCode: 'luo', stats: { uploads: 0, approved: 0, pending: 0 } };
    for (const Component of [AppTopbar, UserMenu]) {
      const html = renderToStaticMarkup(React.createElement(Component, props));
      assert.match(html, new RegExp(`href="${target}"[^>]*>My dashboard`));
      assert.match(html, /href="\/settings"/);
      if (Component === UserMenu || isAdmin || isSuperAdmin) assert.match(html, /href="\/application"/);
      if (isSuperAdmin) assert.doesNotMatch(html, /href="\/admin\/dashboard"/);
      if (!isAdmin && !isSuperAdmin) assert.doesNotMatch(html, /href="\/(super-admin|admin)\/dashboard"/);
    }
  }
});

test('master-only role flags receive the full sidebar with the correct active dashboard', () => {
  const { AdminSidebar } = loader({
    './navigation-link': { NavigationLink: Link },
    'next/navigation': { usePathname: () => '/super-admin/dashboard' },
  })('src/components/layout/admin-sidebar.tsx');
  const html = renderToStaticMarkup(React.createElement(AdminSidebar, { isSuperAdmin: false, isMasterSuperAdmin: true, roles: [] }));
  assert.match(html, /href="\/super-admin\/dashboard"[^>]*class="[^"]*border-l-2/);
  assert.match(html, /href="\/super-admin\/system"/);
  assert.match(html, /href="\/admin\/interface"/);
  assert.doesNotMatch(html, /href="\/admin\/dashboard"/);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(hrefs.length, new Set(hrefs).size);
});

test('English navigation keeps each community and record instead of switching to a different culture', () => {
  const { pairedLanguageNavigation } = loader()('src/lib/app-navigation.ts');
  for (const code of ['luo', 'kik', 'luh']) {
    const local = pairedLanguageNavigation(code, `/${code}/ngero/record-1`, 'q=heritage');
    const translated = new URL(local.alternateHref, 'https://heritage.test');
    assert.equal(translated.pathname, '/eng/ngero/record-1');
    assert.equal(translated.searchParams.get('culture'), code);
    const english = pairedLanguageNavigation('eng', translated.pathname, translated.search);
    assert.equal(english.alternateHref, `/${code}/ngero/record-1?q=heritage`);
    assert.equal(english.cultureQuery, `?culture=${code}`);
  }
  for (const culture of ['', 'eng', '../../admin', '//evil.test']) {
    assert.equal(pairedLanguageNavigation('eng', '/eng/ngero/record-1', `culture=${encodeURIComponent(culture)}`).alternateHref, '/application');
  }
});

test('English header module links retain the selected community', () => {
  const { Header } = loader({
    'next/link': Link,
    'next/navigation': { usePathname: () => '/eng/ngero', useSearchParams: () => new URLSearchParams('culture=kik') },
    'next-auth/react': { useSession: () => ({ data: null }) },
    '@/components/providers/language-provider': { useLanguage: () => ({ language: { code: 'eng', nativeName: 'English' }, t: code => code }) },
  })('src/components/layout/header.tsx');
  const html = renderToStaticMarkup(React.createElement(Header));
  for (const module of ['muma', 'ngero', 'ngeche', 'wende', 'sigana', 'search']) assert.ok(html.includes(`href="/eng/${module}?culture=kik"`));
  assert.match(html, /href="\/kik\/ngero"/);
});

test('static layout navigation destinations resolve to existing application pages', () => {
  const pages = fs.readdirSync('src/app', { recursive: true }).filter(name => /(?:^|[\\/])page\.tsx$/.test(name)).map(name => '/' + name.replaceAll('\\', '/').split('/').filter(part => !/^\(.+\)$/.test(part)).slice(0, -1).join('/'));
  const matches = destination => pages.some(route => {
    const pattern = route.split('/').map(segment => segment.startsWith('[') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/');
    return new RegExp(`^${pattern}$`).test(destination);
  });
  let checked = 0;
  for (const file of fs.readdirSync('src/components/layout').filter(name => name.endsWith('.tsx'))) {
    const source = fs.readFileSync(path.join('src/components/layout', file), 'utf8');
    for (const [, href] of source.matchAll(/href(?:=|:\s*)["'](\/[^"']*)["']/g)) {
      const destination = href.split(/[?#]/)[0];
      assert.ok(matches(destination), `${file}: ${href} must resolve to an application page`);
      checked++;
    }
  }
  assert.ok(checked > 30);
});
