import Project from '@/models/Project';

export function getEffectiveDates(proj) {
  const startDates = [];
  const endDates = [];
  
  if (proj.projectType?.includes('Development')) {
    if (proj.devStartDate) startDates.push(new Date(proj.devStartDate));
    if (proj.devEndDate) {
      startDates.push(new Date(proj.devEndDate));
      endDates.push(new Date(proj.devEndDate));
    }
  }
  if (proj.projectType?.includes('360 Deg Digital Marketing')) {
    if (proj.marketingStartDate) startDates.push(new Date(proj.marketingStartDate));
    if (proj.marketingEndDate) {
      startDates.push(new Date(proj.marketingEndDate));
      endDates.push(new Date(proj.marketingEndDate));
    }
  }
  if (proj.projectType?.includes('Meta / Google Ads')) {
    if (proj.adsDate) {
      startDates.push(new Date(proj.adsDate));
      endDates.push(new Date(proj.adsDate));
    }
  }
  
  const effectiveStartDate = startDates.length > 0 ? new Date(Math.min(...startDates)) : (proj.startDate ? new Date(proj.startDate) : null);
  const effectiveEndDate = endDates.length > 0 ? new Date(Math.min(...endDates)) : (proj.endDate ? new Date(proj.endDate) : null);
  
  return { effectiveStartDate, effectiveEndDate };
}

export function getOverallStatus(proj) {
  const activeTypes = proj.projectType || [];
  if (activeTypes.length === 0) {
    return proj.status || 'Planning';
  }
  
  const statuses = [];
  const now = new Date();
  
  if (activeTypes.includes('Development')) {
    let devStatus = proj.devStatus || 'Planning';
    if (devStatus !== 'Completed' && proj.devEndDate && new Date(proj.devEndDate) < now) {
      devStatus = 'Pending';
    }
    statuses.push(devStatus);
  }
  
  if (activeTypes.includes('360 Deg Digital Marketing')) {
    let marketingStatus = proj.marketingStatus || 'Planning';
    if (marketingStatus !== 'Completed' && proj.marketingEndDate && new Date(proj.marketingEndDate) < now) {
      marketingStatus = 'Pending';
    }
    statuses.push(marketingStatus);
  }
  
  if (activeTypes.includes('Meta / Google Ads')) {
    let adsStatus = proj.adsStatus || 'Planning';
    if (adsStatus !== 'Completed' && proj.adsDate && new Date(proj.adsDate) < now) {
      adsStatus = 'Pending';
    }
    statuses.push(adsStatus);
  }
  
  if (statuses.length === 0) {
    return proj.status || 'Planning';
  }
  
  // Derivation hierarchy: Pending > Under Review > In Progress > Planning > Completed
  if (statuses.includes('Pending')) return 'Pending';
  if (statuses.includes('Under Review')) return 'Under Review';
  if (statuses.includes('In Progress')) return 'In Progress';
  if (statuses.includes('Planning')) return 'Planning';
  return 'Completed';
}

export function processProjectStatus(proj) {
  const { effectiveStartDate, effectiveEndDate } = getEffectiveDates(proj);
  
  let devStatus = proj.devStatus || 'Planning';
  let marketingStatus = proj.marketingStatus || 'Planning';
  let adsStatus = proj.adsStatus || 'Planning';
  let modified = false;
  const now = new Date();
  
  if (proj.projectType?.includes('Development') && proj.devEndDate && new Date(proj.devEndDate) < now && devStatus !== 'Completed') {
    if (devStatus !== 'Pending') {
      devStatus = 'Pending';
      modified = true;
    }
  }
  if (proj.projectType?.includes('360 Deg Digital Marketing') && proj.marketingEndDate && new Date(proj.marketingEndDate) < now && marketingStatus !== 'Completed') {
    if (marketingStatus !== 'Pending') {
      marketingStatus = 'Pending';
      modified = true;
    }
  }
  if (proj.projectType?.includes('Meta / Google Ads') && proj.adsDate && new Date(proj.adsDate) < now && adsStatus !== 'Completed') {
    if (adsStatus !== 'Pending') {
      adsStatus = 'Pending';
      modified = true;
    }
  }
  
  const updatedProj = {
    ...proj,
    devStatus,
    marketingStatus,
    adsStatus,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate
  };
  
  const computedOverallStatus = getOverallStatus(updatedProj);
  if (proj.status !== computedOverallStatus) {
    modified = true;
  }
  
  if (modified) {
    Project.updateOne(
      { _id: proj._id },
      {
        $set: {
          devStatus,
          marketingStatus,
          adsStatus,
          status: computedOverallStatus,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate
        }
      }
    ).catch(err => console.error('Error background auto-updating project in processProjectStatus:', err));
    
    return {
      ...updatedProj,
      status: computedOverallStatus
    };
  }
  
  return updatedProj;
}
