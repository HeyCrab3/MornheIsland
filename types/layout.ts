/**
 * 布局状态接口
 */
export interface LayoutState {
  sidebarCollapsed: boolean
  mobileSidebarVisible: boolean
  layoutMode: 'desktop' | 'mobile'
  fixedHeader: boolean
  fixedSidebar: boolean
  showFooter: boolean
  theme: {
    mode: 'light' | 'dark'
    color: string
  }
}

/**
 * 布局配置选项
 */
export interface LayoutOptions {
  /**
   * 初始侧边栏折叠状态
   */
  initialSidebarCollapsed?: boolean

  /**
   * 初始布局模式
   */
  initialLayoutMode?: 'desktop' | 'mobile'

  /**
   * 是否固定头部
   */
  fixedHeader?: boolean

  /**
   * 是否固定侧边栏
   */
  fixedSidebar?: boolean

  /**
   * 是否显示页脚
   */
  showFooter?: boolean

  /**
   * 响应式断点配置
   */
  breakpoints?: {
    mobile: number  // 移动端断点（小于此值为移动端）
    tablet: number // 平板端断点
    desktop: number // 桌面端断点
  }
}

/**
 * 响应式屏幕尺寸类型
 */
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/**
 * 设备类型
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

/**
 * 响应式布局上下文
 */
export interface ResponsiveContext {
  screenSize: ScreenSize
  windowWidth: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isSmallMobile: boolean
  showOn: {
    mobile: (value?: boolean) => boolean
    tablet: (value?: boolean) => boolean
    desktop: (value?: boolean) => boolean
    xs: (value?: boolean) => boolean
    sm: (value?: boolean) => boolean
    md: (value?: boolean) => boolean
    lg: (value?: boolean) => boolean
    xl: (value?: boolean) => boolean
    '2xl': (value?: boolean) => boolean
  }
  hideOn: {
    mobile: (value?: boolean) => boolean
    tablet: (value?: boolean) => boolean
    desktop: (value?: boolean) => boolean
    xs: (value?: boolean) => boolean
    sm: (value?: boolean) => boolean
    md: (value?: boolean) => boolean
    lg: (value?: boolean) => boolean
    xl: (value?: boolean) => boolean
    '2xl': (value?: boolean) => boolean
  }
  breakpoints: Record<string, number>
  currentBreakpoint: () => ScreenSize
}