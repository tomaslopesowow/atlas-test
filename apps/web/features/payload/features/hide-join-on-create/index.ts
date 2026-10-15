import { type Config, traverseFields } from 'payload';

export const hideJoinOnCreate = () => {
    return (payloadConfig: Config) => {
        if (!payloadConfig.collections) {
            payloadConfig.collections = [];
        }

        for (const payloadCollectionConfig of payloadConfig.collections) {
            traverseFields({
                callback: ({ field }) => {
                    if (field.type !== 'join') {
                        return;
                    }

                    if (!field.admin) {
                        field.admin = {};
                    }

                    const existingCondition = field.admin.condition;

                    field.admin.condition = (...args) => {
                        const existingResult = existingCondition
                            ? existingCondition(...args)
                            : true;

                        if (!existingResult) return existingResult;

                        return Boolean(args[0].id);
                    };
                },
                fields: payloadCollectionConfig.fields,
            });
        }

        return payloadConfig;
    };
};
