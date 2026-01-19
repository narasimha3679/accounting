import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmployeePersonalInfo from '../components/employee/EmployeePersonalInfo';

const EmployeeInfoPage: React.FC = () => {
    const { user } = useAuth();

    if (!user?.employee?.id) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Employee information not found</p>
            </div>
        );
    }

    return <EmployeePersonalInfo employeeId={user.employee.id} />;
};

export default EmployeeInfoPage;
