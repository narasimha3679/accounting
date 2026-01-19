import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmployeeT4Access from '../components/employee/EmployeeT4Access';

const EmployeeTaxDocumentsPage: React.FC = () => {
    const { user } = useAuth();

    if (!user?.employee?.id) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Employee information not found</p>
            </div>
        );
    }

    return <EmployeeT4Access employeeId={user.employee.id} />;
};

export default EmployeeTaxDocumentsPage;
