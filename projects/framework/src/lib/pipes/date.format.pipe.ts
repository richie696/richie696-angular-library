import { Pipe, PipeTransform, inject, LOCALE_ID } from '@angular/core';
import { formatDate } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'dateFormat',
  standalone: true,
  pure: false, // 语言切换时需要重新计算
})
export class DateFormatPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);
  private readonly translate = inject(TranslateService);
  private resolveLocale(): string {
    const lang = (this.translate.currentLang() || '').toLowerCase();
    switch (lang) {
      case 'en-us':
      case 'en':
        return 'en-US';
      case 'zh-tw':
      case 'zh-hant':
        return 'zh-TW';
      case 'zh-cn':
      case 'zh':
      case 'zh-hans':
        return 'zh-CN';
      default:
        return this.locale || 'en-US';
    }
  }

  transform(value: string | Date | null | undefined, format?: string): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    const fmt = format || this.translate.instant('app.common.dateFormat') || 'yyyy-MM-dd';
    const effectiveLocale = this.resolveLocale();
    return formatDate(date, fmt, effectiveLocale);
  }
}

@Pipe({
  name: 'dateTimeFormat',
  standalone: true,
  pure: false, // 语言切换时需要重新计算
})
export class DateTimeFormatPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);
  private readonly translate = inject(TranslateService);
  private resolveLocale(): string {
    const lang = (this.translate.currentLang() || '').toLowerCase();
    switch (lang) {
      case 'en-us':
      case 'en':
        return 'en-US';
      case 'zh-tw':
      case 'zh-hant':
        return 'zh-TW';
      case 'zh-cn':
      case 'zh':
      case 'zh-hans':
        return 'zh-CN';
      default:
        return this.locale || 'en-US';
    }
  }

  transform(value: string | Date | null | undefined, format?: string): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    const fmt = format || this.translate.instant('app.common.dateTimeFormat') || 'yyyy-MM-dd HH:mm:ss';
    const effectiveLocale = this.resolveLocale();
    return formatDate(date, fmt, effectiveLocale);
  }
}

