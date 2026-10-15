import {
    BadRequestException,
    Injectable,
    type PipeTransform,
} from '@nestjs/common';

/** The largest id a Postgres integer column holds; a larger one could only fail in a query. */
export const MAX_ID = 2_147_483_647;

/** Whether a string is an id a row could have: digits only, no sign, padding or exponent. */
export const isId = (value: string): boolean =>
    /^[1-9]\d*$/.test(value) && Number(value) <= MAX_ID;

/** ParseIntPipe for ids, which also refuses one no row could have rather than letting the query fail. */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
    transform(value: string): number {
        if (!isId(value))
            throw new BadRequestException(`"${value}" is not an id`);

        return Number(value);
    }
}
