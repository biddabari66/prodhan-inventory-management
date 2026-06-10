import { format } from 'date-fns';

export function createPageUrl(pageName: string) {
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}

export function safeFormatDate(dateValue: any, formatString: string = 'PP') {
    if (!dateValue) return '-';
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? '-' : format(d, formatString);
}