import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    getMediaCollection,
    getMediaCollections,
    Media,
} from './media.decorator.js';

class Post {
    @Media({ conversions: { thumb: { width: 320, format: 'jpeg' } } })
    cover?: never;

    @Media()
    attachments?: never;

    @Media({ single: true })
    author?: never;
}

describe('Media', () => {
    it('declares each decorated property as a collection with its options', () => {
        assert.deepEqual(getMediaCollection(Post, 'cover'), {
            conversions: { thumb: { width: 320, format: 'jpeg' } },
        });
        assert.deepEqual(getMediaCollection(Post, 'attachments'), {});
        assert.deepEqual(getMediaCollection(Post, 'author'), { single: true });
    });

    it('refuses a conversion named "original", the name the uploaded file already has', () => {
        assert.throws(
            () => Media({ conversions: { original: { width: 100 } } }),
            /cannot be named "original"/,
        );
    });
});

describe('getMediaCollections', () => {
    it('lists every collection a class declares', () => {
        assert.deepEqual(Object.keys(getMediaCollections(Post)), [
            'cover',
            'attachments',
            'author',
        ]);
    });

    it('finds none on a class that declares no collection', () => {
        class Tag {}

        assert.deepEqual(getMediaCollections(Tag), {});
    });
});

describe('getMediaCollection', () => {
    it('finds nothing on a class that declares no collection', () => {
        class Tag {}

        assert.equal(getMediaCollection(Tag, 'cover'), undefined);
    });

    it('finds nothing for the names every object inherits', () => {
        // the `collection` of an upload request reaches this lookup as sent
        for (const name of ['constructor', '__proto__', 'toString']) {
            assert.equal(
                getMediaCollection(Post, name),
                undefined,
                `"${name}" resolves to a declared collection`,
            );
        }
    });

    it('gives a subclass the collections its parent declares', () => {
        // as TypeORM entities inherit the columns of a base class
        class Base {
            @Media()
            avatar?: never;
        }
        class Member extends Base {}
        class Admin extends Base {
            @Media()
            signature?: never;
        }

        assert.deepEqual(getMediaCollection(Member, 'avatar'), {});
        assert.deepEqual(getMediaCollection(Admin, 'avatar'), {});
    });

    it('lets a subclass redeclare a collection it inherits, leaving the parent as it was', () => {
        class Base {
            @Media()
            avatar?: never;
        }
        class Admin extends Base {
            @Media({ conversions: { square: { width: 64, height: 64 } } })
            override avatar?: never;
        }

        assert.deepEqual(getMediaCollection(Admin, 'avatar'), {
            conversions: { square: { width: 64, height: 64 } },
        });
        assert.deepEqual(getMediaCollection(Base, 'avatar'), {});
    });
});
