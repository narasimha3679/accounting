import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmployeeTD1Form from '../components/employee/EmployeeTD1Form';

const EmployeeTD1Page: React.FC = () => {
    const { user } = useAuth();

    if (!user?.employee?.id) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Employee information not found</p>
            </div>
        );
    }

    return <EmployeeTD1Form employeeId={user.employee.id} />;
};

export default EmployeeTD1Page;
