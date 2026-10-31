import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.SITE_BASE || '/',
  markdown: { processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }) },
  integrations: [starlight({
    title: '操作系统概论',
    description: '依据教材与考试大纲整理的课程笔记',
    defaultLocale: 'root',
    locales: { root: { label: '简体中文', lang: 'zh-CN' } },
    favicon: '/favicon.svg',
    customCss: ['./src/styles/notes.css', 'katex/dist/katex.min.css'],
    components: { MarkdownContent: './src/components/NoteContent.astro' },
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
    sidebar: [
      { label: '学习首页', link: '/' },
      { label: '章节笔记', items: [
        { label: '01 · 操作系统简介', slug: 'chapters/chapter-1' },
        { label: '02 · 进程管理', slug: 'chapters/chapter-2' },
        { label: '03 · 进程调度与死锁', slug: 'chapters/chapter-3' },
      ] },
      { label: '交互练习', items: [{ label: '进程调度实验', slug: 'lab/scheduling' }] },
    ],
  })],
});
