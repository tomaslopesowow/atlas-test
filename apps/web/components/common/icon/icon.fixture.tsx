'use client';

import { ICON_MAP } from '@/components/utils/icon-map';
import { useFixtureSelect } from 'react-cosmos/client';
import { Icon, type IconName } from '.';

const Fixture = () => {
    const [name] = useFixtureSelect<IconName>('name', {
        options: Object.keys(ICON_MAP) as IconName[],
    });

    return (
        <div className="w-full h-screen bg-gray-4 flex justify-center items-center">
            <Icon name={name} className="size-36 text-green-10" />
        </div>
    );
};

export default Fixture;
