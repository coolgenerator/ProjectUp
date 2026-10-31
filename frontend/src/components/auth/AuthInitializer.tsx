import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setInit } from '../../store/auth';

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const dispatch = useDispatch();

    useEffect(() => {
        // Set init to true once the component mounts
        // This indicates that the auth state has been initialized
        // (either from localStorage via redux-persist or as fresh state)
        dispatch(setInit(true));
    }, [dispatch]);

    return <>{children}</>;
};

export default AuthInitializer;