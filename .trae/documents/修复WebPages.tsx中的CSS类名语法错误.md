### 问题分析
在 `WebPages.tsx` 文件的第465行，存在一个语法错误：
```tsx
<span className={px-2 py-0.5 rounded-full text-xs }>
```

**错误原因**：
- `className` 属性的值被错误地包裹在花括号 `{}` 中
- `px-2 py-0.5 rounded-full text-xs` 是普通的 CSS 类名字符串，不是有效的 JavaScript 表达式
- React 将 `-` 识别为减号运算符，导致语法错误

### 修复方案
1. **修复语法错误**：将 `className` 属性的值从 JavaScript 表达式语法改为普通字符串语法
2. **增强视觉效果**：根据 `webPage.is_active` 的值添加不同的背景色类，区分已启用和已禁用状态

### 具体修改
将第465行代码修改为：
```tsx
<span className={`px-2 py-0.5 rounded-full text-xs ${webPage.is_active === 1 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
```

### 预期效果
- 修复编译错误，使应用能够正常运行
- 为已启用和已禁用的网页项目添加直观的视觉区分
- 保持代码的可读性和可维护性