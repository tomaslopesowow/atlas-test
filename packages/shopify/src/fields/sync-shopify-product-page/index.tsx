'use client';

import {
    FieldLabel,
    TextInput,
    toast,
    useDocumentInfo,
    useField,
} from '@payloadcms/ui';
import Link from 'next/link';
import type { TextFieldClientProps } from 'payload';
import { useMemo } from 'react';
import { extractIdFromGid } from '@/utils/extract-id-from-gid';

import './style.scss';

export type SyncShopifyProductPageButtonProps = TextFieldClientProps & {
    showSyncProduct?: boolean;
};

export default function SyncShopifyProductPageButton({
    field,
    path,
    readOnly,
    showSyncProduct,
}: SyncShopifyProductPageButtonProps) {
    const { label, name, ...fieldProps } = field;
    const { id } = useDocumentInfo();
    const { value, setValue } = useField<string>({ path });

    const productAdminUrl = useMemo(
        () =>
            String(
                new URL(
                    `admin/products/${extractIdFromGid(value)}`,
                    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN,
                ),
            ),
        [value],
    );

    const handleProductSync = () =>
        toast.promise(
            async () => {
                const response = await fetch(
                    `/api/sync-shopify-products?page=${id}`,
                );
                return response.json();
            },
            {
                loading: 'Syncing the product page...',
                success: (data) => data.message,
                error: 'Failed to sync the product.',
                finally: () => {
                    setTimeout(() => window.location.reload(), 1000);
                },
            },
        );

    return (
        <div className="field-type shopify-product-component">
            <div className="label-wrapper">
                <FieldLabel htmlFor={`field-${path}`} label={label} />
                {showSyncProduct && (
                    <Link href="#" onClick={handleProductSync}>
                        Sync product
                    </Link>
                )}
                <Link target="_blank" href={productAdminUrl}>
                    Edit product
                </Link>
            </div>

            <TextInput
                {...fieldProps}
                value={value}
                onChange={setValue}
                path={path || name}
                readOnly={readOnly}
            />
        </div>
    );
}
